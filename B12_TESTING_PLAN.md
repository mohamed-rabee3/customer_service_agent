# B12 — Three-Way Barge-In: Testing Plan

**For:** QA / team member running the manual test.
**You do NOT need to know the codebase.** Follow the steps in order.

---

## 1. What you are testing

A supervisor can join a live customer↔AI voice call as a **third participant**:

- **Monitor** — supervisor silently hears both the customer and the AI agent.
- **Join Call** — supervisor goes live; the **AI stops talking but keeps listening**; supervisor and customer converse.
- **Hand Back to AI** — the AI resumes the conversation.
- Closing the supervisor view must **not** end the customer's call.

This was previously broken ("can't take call or hear agent"). The fixes touch the supervisor UI (`AgentDetailModal`) and the AI voice worker (`voice_session_manager`).

---

## 2. Prerequisites

- Windows machine with the repo checked out, backend `venv` set up, and frontend `npm install` already run.
- A **working microphone + speakers/headphones** (use headphones to avoid echo between the two browser tabs).
- Use **Google Chrome** (best WebRTC + autoplay behavior).
- At least **one voice agent** exists in the system and is **idle/available** (the mock customer auto-assigns one). If the call fails with "no agent available," create/enable a voice agent in the admin UI first.
- An **admin login** for the dashboard.

> ⚠️ **The single most important step:** the **AI voice worker is a separate process**. In the past it was never started, which is why "audio didn't work." It must be running for ANY of this to function.

---

## 3. Start the four pieces

Open **three PowerShell terminals** at the repo root (`customer_service_agent`).

**Terminal 1 — Backend API**
```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
✅ Wait for `Application startup complete.`

**Terminal 2 — AI Voice Worker** *(the critical one)*
```powershell
cd backend
.\venv\Scripts\python.exe -m app.agents.voice_session_manager dev
```
✅ Wait for a line like `registered worker` / `Voice worker ready`. Leave it running and watch it — it prints useful logs (`Supervisor barged in — muting…`, `Customer disconnected…`, etc.).

**Terminal 3 — Frontend**
```powershell
cd frontend
npm run dev
```
✅ Note the URL (usually `http://localhost:5173`).

**The customer client** — open `frontend/mock-call.html` directly in a second Chrome tab/window (File → Open, or drag the file in). It has a **Backend URL** field that should read `http://localhost:8000`.

---

## 4. Smoke check (must pass before the real tests)

| # | Step | Expected |
|---|------|----------|
| S1 | In `mock-call.html`, click **Call** and allow mic access. | Status → "In Call"; within a few seconds you **hear the AI greet you** through your speakers. |
| S2 | Speak ("Hi, I need help with my order"). | The AI responds by voice. Terminal 2 logs transcript activity. |

> If S1/S2 fail, **stop** — the AI worker or audio path is the problem, not the barge-in feature. Note which terminal shows an error and report it. Do not continue to Section 5.

---

## 5. Test cases

Keep the **customer call from S1 active** for these. Log into the **admin dashboard** (frontend URL) in a third tab, go to the **Voice Agents** view, and click the agent that is currently **IN CALL** to open its detail modal.

### TC-1 — Supervisor can hear the live call (audio playback)
1. Open the in-call agent's modal.
2. If a button **"Enable audio to hear the call"** appears, click it.

**Expected:** After clicking (or immediately, if no button appeared) you hear the **same conversation** the customer hears — both the customer's voice and the AI. The "Live Feed" panel shows transcript lines.
**Pass / Fail:** ____

### TC-2 — Join Call (three-way + AI mute)
1. Have the customer (mock tab) say something so the AI is mid-conversation.
2. In the modal, click **Join Call**. Allow mic access if prompted.

**Expected:**
- Button changes to **"Hand Back to AI"**; a banner shows "You are live — the AI is muted and listening."
- The **AI stops speaking**.
- When you (supervisor) speak, the **customer hears you** in the mock tab.
- Terminal 2 logs `Supervisor barged in — muting agent … audio output`.

**Pass / Fail:** ____

### TC-3 — AI keeps listening while muted
1. While joined (TC-2), have the **customer** speak a sentence.

**Expected:** The AI does **not** talk over you (stays muted). The customer↔supervisor conversation flows naturally. (The AI is still transcribing for context — it just isn't speaking.)
**Pass / Fail:** ____

### TC-4 — Hand Back to AI
1. Click **Hand Back to AI**.

**Expected:**
- Your mic is muted (customer no longer hears you).
- The **AI resumes speaking** with a brief acknowledgement and continues helping the customer.
- Button returns to **"Join Call"**.
- Terminal 2 logs `Supervisor handed call back — un-muting agent …`.

**Pass / Fail:** ____

### TC-5 — Supervisor leaving does NOT end the call
1. With the customer call still active (AI handling it), **close the agent modal** (X or click outside).

**Expected:** The **customer's call continues** — the mock tab still shows "In Call" and the AI keeps responding. The call is **not** marked completed/abandoned. Terminal 2 logs `Non-customer participant '…' left room … — call continues.`
**Pass / Fail:** ____

### TC-6 — Normal call end still works
1. In the **mock customer** tab, click **Hang Up** (or End Call).

**Expected:** Terminal 2 logs `Customer disconnected … Starting post-call processing…`; the agent returns to IDLE; the interaction is archived/summarized. (Re-open the agent later to confirm it's idle.)
**Pass / Fail:** ____

### TC-7 — Repeat Join → Hand Back twice
1. Start a fresh call (mock **Call** again), then in the modal do **Join → Hand Back → Join → Hand Back**.

**Expected:** Each toggle works reliably; the AI mutes/resumes each time without getting "stuck" muted or doubling up replies.
**Pass / Fail:** ____

---

## 6. Things to watch for (report these specifically)

- **AI talks over the supervisor after Join.** This is the one known runtime risk (muting the realtime model's output). If it happens, note *when* (immediately on Join, or only after the customer speaks) — that detail determines the fix.
- **No audio at all even after "Enable audio."** Note whether the Live Feed transcript still updates (means connected, audio-only issue) or not (means connection issue).
- **Echo/feedback** — usually because both tabs use speakers; use headphones.
- **Mic permission denied** — the browser must allow mic for both the mock tab and the dashboard tab.

---

## 7. Result summary (fill in)

| Test | Result | Notes |
|------|--------|-------|
| S1 AI greeting | ☐ Pass ☐ Fail | |
| S2 AI responds | ☐ Pass ☐ Fail | |
| TC-1 Supervisor hears call | ☐ Pass ☐ Fail | |
| TC-2 Join + AI mutes | ☐ Pass ☐ Fail | |
| TC-3 AI listens (no talk-over) | ☐ Pass ☐ Fail | |
| TC-4 Hand back resumes AI | ☐ Pass ☐ Fail | |
| TC-5 Supervisor leave safe | ☐ Pass ☐ Fail | |
| TC-6 Customer hang-up ends call | ☐ Pass ☐ Fail | |
| TC-7 Repeated toggles | ☐ Pass ☐ Fail | |

**Environment:** Chrome version ____ · Date ____ · Tester ____
**Overall:** ☐ Ready ☐ Needs work — summary: __________________________

---

## 8. Reference — what changed (for whoever fixes failures)

- **Frontend** `frontend/src/components/agents/AgentDetailModal.tsx`
  - Audio playback: `play().catch()`, `RoomEvent.AudioPlaybackStatusChanged`, `room.startAudio()` button.
  - `handleJoin` → publishes LiveKit data on topic `agent_mute` + enables mic.
  - `handleHandBack` → publishes `agent_unmute` + disables mic.
- **Worker** `backend/app/agents/voice_session_manager.py`
  - `on_data_received` handles `agent_mute` (`session.interrupt()` + `session.output.set_audio_enabled(False)`) and `agent_unmute` (`set_audio_enabled(True)` + resume `generate_reply`).
  - Muted assistant transcript lines are suppressed from the live feed.
  - `participant_disconnected` ends the call only for `customer-…` identities.
- **Control channel:** LiveKit data messages (same mechanism as supervisor "whisper").
- **Full design rationale:** see `B12_THREE_WAY_BARGEIN_PLAN.md`.
