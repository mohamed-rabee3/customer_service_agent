# B12 — Three-Way Barge-In Plan

> **Goal:** Replace the current unreliable "Take Over" behavior with a true **three-way call**: when a supervisor barges in, the AI agent **stays in the room and keeps listening** (muted), the supervisor and customer talk, and the supervisor can **hand the call back to the AI** at any time.

---

## Context — why this change

The frontend testing report (item **B12**) reported: *"Barge-in: can't take call or hear agent."* Investigation showed two layers of problems:

1. **Operational:** the AI voice agent runs as a **separate worker process** (`app.agents.voice_session_manager`). `run_all.py` only starts uvicorn + frontend + ngrok — **not** the worker. With no worker, no AI joins the room, so there is no agent audio to hear and the AI never speaks. This alone explains most of "audio doesn't work."
2. **Code:** even with the worker running, (a) the supervisor's browser silently blocks audio playback (autoplay policy, no `room.startAudio()`), (b) the current "Take Over" only sends the AI a *text whisper* asking it to be quiet (unreliable — the AI keeps talking), and (c) the agent's disconnect handler ends the call when the **supervisor** leaves (it can't tell the supervisor apart from the customer).

The desired outcome — proposed by the product owner — is a **three-way conference with a reliable AI mute/un-mute toggle**, which is *less* work than a true takeover because the room is already a 3-party conference today.

---

## How the audio path actually works

```
Customer (mock-call.html / telephony)  ──mic──►  LiveKit room  ◄──mic── Supervisor (AgentDetailModal)
                                                      ▲  │
                                         AI agent TTS │  │ agent subscribes to customer mic
                                          (voice worker process)
```

- **AI agent** = separate worker (`voice_session_manager.py`), joins via the LiveKit Agents SDK (`session.start(room=ctx.room, …)`), publishes TTS audio and subscribes to the customer mic. Identity starts with `agent-`.
- **Customer** = `interaction_service.py` issues a token with identity `customer-<hex>` (test client: `frontend/mock-call.html`).
- **Supervisor** = `AgentDetailModal.tsx` fetches a token (`POST /v1/interactions/{id}/supervisor-token`), identity is the supervisor's UUID, joins the same room, attaches incoming audio tracks. On barge-in it enables its own mic.
- **Config:** `livekit_ws_url` derives from `LIVEKIT_URL` in `backend/.env` (already set) — not a cause.
- **Existing control channel:** the worker already handles LiveKit **data messages** in `on_data_received` (topic `whisper`). We reuse this exact mechanism for mute/un-mute.

SDK: `livekit-agents ~=1.4` → `AgentSession` provides `session.interrupt()` and per-stream audio enable/disable. Realtime LLM is Gemini (`google.beta.realtime`).

---

## Redesigned flow

| State | Supervisor mic | AI audio out | AI listening? | Trigger |
|-------|----------------|--------------|---------------|---------|
| **Monitoring** (default) | off | on (speaking) | yes | modal opens |
| **Joined** (barge-in) | **on** | **muted** | **yes** (still transcribes for context) | "Join Call" |
| **Hand back** | off | on (resumes) | yes | "Hand Back to AI" |

Control = data messages on two new topics: `agent_mute` / `agent_unmute`.

---

## Changes

### 1. Frontend — `frontend/src/components/agents/AgentDetailModal.tsx`

**a. Audio playback fix (mandatory — supervisor can't hear without it):**
- After `await r.connect(...)`, if `!r.canPlaybackAudio`, expose a visible **"🔊 Enable audio"** button whose click handler calls `await r.startAudio()` (must run inside the user gesture).
- Subscribe to `RoomEvent.AudioPlaybackStatusChanged` to show/hide that button.
- In the `TrackSubscribed` handler, also call `audioEl.play().catch(() => { /* playback blocked — button handles it */ })`.

**b. Replace "Take Over" with "Join Call" / "Hand Back":**
- Rename the button: `Take Over Call` → **`Join Call`**; when joined, label it **`Hand Back to AI`** and toggle behavior.
- `handleJoin` (replaces `handleTakeOver`):
  - `await livekitRoom.localParticipant.setMicrophoneEnabled(true)`
  - `await livekitRoom.localParticipant.publishData(encode({}), { topic: "agent_mute", reliable: true })`
  - set `joined = true` (replaces `takenOver`).
- `handleHandBack`:
  - `await livekitRoom.localParticipant.setMicrophoneEnabled(false)`
  - `publishData(encode({}), { topic: "agent_unmute", reliable: true })`
  - set `joined = false`.
- Remove the old "mute yourself" whisper from the join path.

### 2. Worker — `backend/app/agents/voice_session_manager.py`

**a. Handle the new topics in `on_data_received`** (alongside the existing `whisper` branch). Track a `muted` flag in a small mutable state dict:
- `agent_mute`:
  - `asyncio.create_task(session.interrupt())` to cut any in-progress speech.
  - disable agent audio output (verify exact API for 1.4: prefer `session.output.set_audio_enabled(False)`; fallback = toggle the RoomIO audio output sink). Keep **input enabled** so the model still hears/transcribes for context.
  - set `muted = True`.
- `agent_unmute`:
  - re-enable agent audio output (`session.output.set_audio_enabled(True)`).
  - `session.generate_reply(instructions="The supervisor has handed the call back to you. Briefly acknowledge and continue helping the customer where the conversation left off. Do not mention supervisors.")`
  - set `muted = False`.

**b. Fix the disconnect guard** (`on_participant_disconnected`, ~line 469): only trigger post-call processing for the **customer**, so the supervisor leaving never ends the call:
```python
if participant.identity.startswith("customer-"):
    asyncio.create_task(_run_post_call_once())
```
(Currently: `if not participant.identity.startswith("agent-")`, which wrongly fires for the supervisor's UUID identity.)

---

## Risks / unknowns (small, contained)

- **Exact mute API on a realtime (Gemini) session** in `livekit-agents 1.4`: confirm `session.output.set_audio_enabled(...)` exists and that muting output (while leaving input on) behaves as expected. Worst case, gate speech with `session.interrupt()` plus an output-sink toggle. Everything else reuses proven code paths (`publishData` ↔ `data_received`, already used by whisper).
- A muted realtime model still generates internally (consumes API quota) while output is suppressed — acceptable, and what keeps it "listening" with context.

---

## Verification

**Phase 0 — prerequisites (no code):**
1. Start backend: `cd backend; .\venv\Scripts\python.exe -m uvicorn app.main:app --port 8000`
2. **Start the voice worker** (the missing piece): `cd backend; .\venv\Scripts\python.exe -m app.agents.voice_session_manager dev`
3. Start frontend: `cd frontend; npm run dev`
4. Open `frontend/mock-call.html` as the **customer**, start a call, confirm the **AI greets you** → proves worker + room audio work before touching the supervisor side.

**Phase 1 — supervisor can hear:** open the agent in the admin UI (`AgentDetailModal`). If audio is blocked, the "Enable audio" button appears → click it → supervisor hears **both** customer and AI.

**Phase 2 — three-way + hand back:**
- Click **Join Call** → supervisor mic goes live, **AI stops speaking** (but transcript keeps updating, proving it still listens), supervisor and customer converse.
- Click **Hand Back to AI** → AI resumes with a short acknowledgement and continues the conversation.

**Phase 3 — supervisor leave is safe:** close the modal mid-call → the customer's call **continues** (AI still active); it is not marked completed/abandoned.

---

## Out of scope (for now)
- Telephony/Telegram real customer audio path (test with `mock-call.html`).
- Visual indicator to the customer that a human joined (not required).
- Persisting "supervisor joined" events to the interaction record (could add later for analytics).
