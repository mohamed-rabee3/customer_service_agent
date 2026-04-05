# Mobile App Development Prompt for Stitch

**Instructions for Stitch**: You are an expert mobile application developer. You are tasked with creating the mobile application for our "Customer Service AI Agents Platform." Below is the comprehensive technical context of our existing backend, database, and system architecture. Proceed to outline your technical approach and then begin scaffolding the mobile app according to these specifications.

---

## 1. Project High-Level Overview

The **Customer Service AI Agents Platform** is an intelligent, voice-enabled support system that bridges automated AI agents and human supervisors. It allows customers to converse naturally via voice (WebRTC) or chat, while human supervisors monitor sentiment in real-time, inject context ("Whisper Mode"), or seamlessly take over the session.

You are tasked with building the **Mobile Application**. Depending on the target audience set by the user, this mobile app must support:
1. **The Customer Touchpoint**: A mobile interface that simulates a phone dialer / support chat where customers interact with the AI.
2. **The Supervisor/Admin Dashboard**: A mobile command center to monitor live calls/chats, view real-time sentiment metrics, and manage agent configurations.

## 2. Current Multi-Layered Architecture

- **Backend core**: FastAPI (Python), utilizing async processing.
- **Database / Auth**: Supabase Auth (JWT data mapping) and PostgreSQL with Row-Level Security (RLS).
- **Voice/Real-Time Comm**: LiveKit (WebRTC) for low-latency voice streaming.
- **AI Processing**: Gemini 2.5 (Flash/Flash-Lite) for LLM reasoning & TTS, and Groq (Whisper v3) for near-instant Speech-to-Text.
- **Real-Time Data**: Server-Sent Events (SSE) used to push live metrics (like Customer Sentiment Scores) and chat messages to the frontend.

## 3. Database Schema Overview
The backend relies on the following core entities (Supabase Postgres):
- `supervisors` / `admin`: Linked 1:1 with `auth.users`. Contains performance metrics securely scoped via RLS.
- `agents`: AI configurations (system prompt, type: `voice`|`chat`, status, id).
- `interactions`: Active and historical calls/chats. Maps to `agent_id`. Tracks `interaction_type`, `started_at`, `status`.
- `chat_messages`: Rows mapping to `interaction_id` with roles (`customer`, `agent`, `supervisor`).
- `realtime_metrics`: Linked to `interaction_id`. Stores real-time `sentiment` (good, neutral, critical) and `satisfaction_score`.

## 4. Key APIs and Integration Requirements

The Mobile Application needs to interact with the following API behaviors:

### A. Authentication
- The app must use **Supabase Auth** or call `/v1/auth/login` to obtain access/refresh JWT tokens.
- All requests to restricted endpoints require an `Authorization: Bearer <TOKEN>` header.

### B. Voice Sessions (Customer/Supervisor Takeover)
- Voice is powered by **LiveKit**. The mobile app should ideally use the appropriate `livekit-client` SDK (React Native / Flutter / Swift / Kotlin) depending on the stack chosen.
- A request to the backend will generate a LiveKit `room name` and a `token`. The mobile client uses these to connect its microphone data to the session.

### C. Chat & Live Monitoring (Server-Sent Events)
- For Chat or Supervisor observation, the backend exposes SSE streams, primarily `/v1/chat/sessions/{session_id}/stream`.
- **Constraint**: Because native `EventSource` doesn't support setting headers easily, the API accepts the JWT via query param: `?token=YOUR_JWT`.
- **SSE Events handling**: The app must parse JSON streams for `event` types: `connected`, `message`, `metrics`, `whisper`, and `status`.

### D. CRUD Endpoints Available
- **GET /v1/interactions**: Fetches history of calls/chats with pagination, filterable by `status`.
- **GET /v1/agents**: Returns assigned AI agents (idle, in_call, paused).
- **PATCH /v1/interactions/{id}**: Update status (e.g., end call, escalate).

## 5. Required Mobile Capabilities Workflows

Depending on the role the user logs in as (Customer vs. Supervisor), implement the respective UI flows:

### Workflow 1: Customer Touchpoint
- **Mock Dialer/Chat Interface**: A sleek, consumer-friendly screen to "Call Support" or "Chat Now".
- **Voice Flow**: Upon dialing, request microphone permission -> retrieve LiveKit token from backend -> connect to room -> display glowing/pulsing animation while AI is talking.
- **Chat Flow**: Standard chat interface displaying messages.

### Workflow 2: Supervisor Interface (Human-in-the-loop)
- **Monitoring Hub**: View a list of "Active Interactions".
- **Real-Time Sentiment**: Consume the SSE stream to show a color-coded satisfaction score (e.g., Red if "sentiment" == "critical").
- **Whisper Mode**: A text input to securely inject instructions to the AI agent during an ongoing customer call/chat without the customer hearing it.
- **Full Takeover**: Ability for the supervisor to mute the AI and connect their own LiveKit microphone channel to the customer.

## 6. How to Proceed
1. Please confirm your understanding of the tech stack (FastAPI, Supabase, LiveKit, SSE).
2. Propose your exact mobile framework choice (e.g., React Native with Expo, Flutter) and the required SDKs to achieve LiveKit WebRTC + SSE handling natively.
3. Suggest the initial folder structure and state management approach to handle the complex real-time synchronizations.
4. Wait for approval before generating code.
