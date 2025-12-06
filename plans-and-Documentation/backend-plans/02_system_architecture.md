# System Architecture

## Architecture Overview

The Customer Service AI Agents Platform follows a **single-backend architecture** using FastAPI, with real-time communication powered by LiveKit and Supabase for data persistence.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │            React  Frontend                                 │  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────────────┐  │  │
│  │  │   Admin    │  │ Supervisor │  │  Customer Phone App  │  │  │
│  │  │ Dashboard  │  │ Dashboard  │  │   (Mock Dialer)      │  │  │
│  │  └────────────┘  └────────────┘  └──────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / WebSocket / SSE
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    FastAPI Backend                            │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │            REST API Endpoints                          │  │  │
│  │  │  • Auth (JWT via Supabase)                            │  │  │
│  │  │  • Admin Management                                   │  │  │
│  │  │  • Supervisor Management                              │  │  │
│  │  │  • Agent Configuration                                │  │  │
│  │  │  • Analytics & Reporting                              │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │            SSE Endpoints                               │  │  │
│  │  │  • Real-time Sentiment                                │  │  │
│  │  │  • Real-time Satisfaction                             │  │  │
│  │  │  • Feed Updates                                       │  │  │
│  │  │  • Agent Status                                       │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │         LiveKit Integration Layer                      │  │  │
│  │  │  • Room Management                                    │  │  │
│  │  │  • WebRTC Signaling                                   │  │  │
│  │  │  • Agent Connection Handling                          │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌──────────────────────────────┐  ┌────────────────────────────┐
│    REAL-TIME LAYER           │  │    DATA LAYER              │
│  ┌────────────────────────┐  │  │  ┌──────────────────────┐ │
│  │   LiveKit Server       │  │  │  │  Supabase PostgreSQL │ │
│  │  • WebRTC Rooms        │  │  │  │  • User Data         │ │
│  │  • Audio Streams       │  │  │  │  • Supervisors       │ │
│  │  • Agent Sessions      │  │  │  │  • Agents            │ │
│  └────────────────────────┘  │  │  │  • Call/Chat Archive │ │
│  ┌────────────────────────┐  │  │  │  • Analytics         │ │
│  │   LiveKit Agents SDK   │  │  │  └──────────────────────┘ │
│  │  • Voice Agents        │  │  │  ┌──────────────────────┐ │
│  │  • Chat Agents         │  │  │  │  Supabase Auth (JWT) │ │
│  └────────────────────────┘  │  │  └──────────────────────┘ │
└──────────────────────────────┘  │  ┌──────────────────────┐ │
                                  │  │  Supabase Realtime   │ │
                                  │  │  • Archive Updates   │ │
                                  │  │  • Notifications     │ │
                                  │  └──────────────────────┘ │
                                  └────────────────────────────┘
                                           │
                                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         AI SERVICES LAYER                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Voice Agents                                                 │  │
│  │  • LLM: Gemini 2.5 Flash-Lite                               │  │
│  │  • TTS: Gemini 2.5 Flash Preview TTS                        │  │
│  │  • STT: Whisper v3 Large (Groq)                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Chat Agents                                                  │  │
│  │  • LLM: Gemini 2.5 Flash-Lite                               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Post-Processing                                              │  │
│  │  • Summary & Tags: openai/gpt-oss-20b (Groq)                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Real-time Analytics                                          │  │
│  │  • Sentiment: Lightweight specialized model                  │  │
│  │  • Satisfaction: Lightweight LLM                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Details

### 1. Frontend Layer (React PWA)

**Technology:**
- React 18+
- Progressive Web App (PWA)
- WebRTC for audio/video streams
- EventSource API for SSE
- Supabase Client SDK

**Components:**

1. **Admin Dashboard**
   - Supervisor monitoring cards
   - Leaderboard
   - Analytics dashboard
   - Supervisor management

2. **Supervisor Dashboard**
   - Agent status cards
   - Real-time notifications
   - Whisper/instruction injection
   - Archive browsing

3. **Customer Phone App (Mock)**
   - Mock dialer interface
   - WebRTC audio connection
   - Call controls

**Communication:**
- REST API calls for CRUD operations
- SSE for real-time updates (sentiment, satisfaction, feed, status)
- WebSocket via LiveKit for audio/video
- Supabase Realtime for archive updates

---

### 2. FastAPI Backend

**Technology:**
- FastAPI 0.100+
- Python 3.11+
- Async/await for concurrency
- Pydantic for validation

**Main Modules:**

#### A. Authentication Module
```python
# Uses Supabase Auth
- JWT token generation/validation
- Role-based access control (Admin vs Supervisor)
- Session management
```

#### B. Admin Management Module
```python
- Supervisor CRUD operations
- Dashboard statistics aggregation
- Analytics calculation
- Leaderboard generation
```

#### C. Supervisor Management Module
```python
- Agent CRUD operations
- Call/Chat archive management
- Real-time notifications
- Tool permission handling
```

#### D. LiveKit Integration Module
```python
- Room creation/management
- WebRTC signaling
- Agent session lifecycle
- Customer-agent matching
```

#### E. SSE Module
```python
- Real-time metric streaming
- Connection management
- Event broadcasting
- Graceful disconnection handling
```

#### F. Analytics Module
```python
- KPI calculations (FCR, CSAT, AHT, Performance Score)
- Metric aggregation
- Historical data analysis
- Real-time metric updates
```

---

### 3. LiveKit Real-time Communication

**Components:**

#### A. LiveKit Server
- Manages WebRTC rooms
- Handles audio stream routing
- Quality adaptation
- Connection management

#### B. LiveKit Agents SDK Integration

**Voice Agent Implementation:**
```python
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    WorkerOptions,
    cli,
    llm,
)
from livekit.plugins import deepgram, openai, silero

# Agent configuration per supervisor
class VoiceAgent:
    - STT: Whisper v3 Large via Groq
    - LLM: Gemini 2.5 Flash-Lite
    - TTS: Gemini 2.5 Flash Preview TTS
    - MCP Tools: Custom tools from configuration
```

**Chat Agent Implementation:**
```python
class ChatAgent:
    - LLM: Gemini 2.5 Flash-Lite
    - Message handling via WebSocket
    - Tool integration
    - Context management
```

---

### 4. Database Layer (Supabase)

**PostgreSQL Database:**
- User authentication data
- Supervisor and agent configurations
- Call/chat archives
- Analytics data
- Real-time metrics

**Supabase Features:**
- Auth: JWT-based authentication
- Realtime: Archive and notification updates
- REST API: Automatic API generation
- Row-level security

---

### 5. AI Services Layer

**Service Distribution:**

| Component | Service | Provider | Purpose |
|-----------|---------|----------|---------|
| Voice LLM | Gemini 2.5 Flash-Lite | Google AI | Conversation generation |
| Voice TTS | Gemini 2.5 Flash Preview TTS | Google AI | Speech synthesis |
| Voice STT | Whisper v3 Large | Groq | Speech recognition |
| Chat LLM | Gemini 2.5 Flash-Lite | Google AI | Text conversation |
| Summary/Tags | openai/gpt-oss-20b | Groq | Post-call analysis |
| Real-time Sentiment | Lightweight model | Self-hosted | Sentiment detection |
| Real-time Satisfaction | Lightweight LLM | Self-hosted | Satisfaction estimation |

---

## Data Flow Diagrams

### Call Flow (Voice Agent)

```
┌──────────┐                                    ┌──────────┐
│ Customer │                                    │Supervisor│
│  (PWA)   │                                    │Dashboard │
└────┬─────┘                                    └────┬─────┘
     │                                                │
     │ 1. Initiate Call (mock number)                │
     ├────────────────────────────────►┌─────────────┤
     │                                  │  FastAPI    │
     │ 2. Find Idle Agent               │  Backend    │
     │◄─────────────────────────────────┤             │
     │                                  └──────┬──────┘
     │ 3. Create LiveKit Room                  │
     ├────────────────────────────────────────►│
     │                                          │
     │ 4. Join Room                             │
     ├─────────────────────────────►┌──────────┤
     │                               │ LiveKit  │
     │ 5. Agent Joins Room           │ Server   │
     │◄──────────────────────────────┤          │
     │                               └────┬─────┘
     │ 6. Start Conversation                │
     ├──────────────────────────────────────►
     │                                         │
     │ 7. Audio Stream                         │
     ├────────────────────────────────────────►
     │               ┌─────────────────────────┤
     │               │ LiveKit Agent           │
     │               │ - STT (Whisper)         │
     │               │ - LLM (Gemini)          │
     │               │ - TTS (Gemini)          │
     │               └─────────────────────────┤
     │ 8. Agent Response Audio                 │
     │◄────────────────────────────────────────┤
     │                                         │
     │ 9. Real-time Metrics (SSE)          ┌───┴───┐
     │◄────────────────────────────────────┤FastAPI│
     │    - Sentiment (every 5s)           │Backend│
     │    - Satisfaction (every 5s)        │  SSE  │
     │    - Feed (every 5s)                │       │
     │                                     └───┬───┘
     │                                         │
     │ 10. Supervisor Views Real-time      ────┘
     │                                         │
     │ 11. Tool Permission Request             │
     │◄────────────────────────────────────────┤
     │                                         │
     │ 12. Supervisor Allow/Deny          ┌────┴────┐
     ├────────────────────────────────────►│ Backend │
     │                                     └────┬────┘
     │ 13. Tool Executes                        │
     │◄─────────────────────────────────────────┤
     │                                          │
     │ 14. Call Ends                            │
     ├──────────────────────────────────────────►
     │                                          │
     │ 15. Post-call Processing            ┌────┴────┐
     │     - Summary                       │ Backend │
     │     - Tags                          │   +     │
     │     - CSAT                          │  Groq   │
     │     - FCR calculation               └────┬────┘
     │                                          │
     │ 16. Save to Archive                 ┌────┴────┐
     │◄─────────────────────────────────────┤Supabase │
     │                                      └─────────┘
```

### Whisper/Instruction Injection Flow

```
┌──────────┐                                    ┌──────────┐
│Supervisor│                                    │  Agent   │
│Dashboard │                                    │ (LiveKit)│
└────┬─────┘                                    └────┬─────┘
     │                                                │
     │ 1. Click "Whisper" Button                     │
     ├────────────────────────────────►┌─────────────┤
     │                                  │  FastAPI    │
     │ 2. Signal Agent to Pause         │  Backend    │
     ├──────────────────────────────────►             │
     │                                  └──────┬──────┘
     │                                         │
     │ 3. Agent Pauses & Excuses Customer      │
     │◄────────────────────────────────────────┤
     │                                         │
     │ 4. Supervisor Types Instructions        │
     ├────►                                    │
     │                                         │
     │ 5. Click "Inject"                       │
     ├─────────────────────────────────────────►
     │                                         │
     │ 6. Instructions Sent to Agent           │
     ├─────────────────────────────────────────►
     │                                         │
     │ 7. Agent Acknowledges "Received"        │
     │◄─────────────────────────────────────────┤
     │                                         │
     │ 8. Agent Resumes with Updated Context   │
     │◄─────────────────────────────────────────┤
```


## Security Architecture

### Authentication Flow

```
┌──────────┐                                    ┌──────────┐
│  Client  │                                    │Supabase  │
│  (PWA)   │                                    │   Auth   │
└────┬─────┘                                    └────┬─────┘
     │                                                │
     │ 1. Login Request (email/password)              │
     ├────────────────────────────────────────────────►
     │                                                │
     │ 2. Validate Credentials                        │
     │                                                │
     │ 3. Generate JWT Token                          │
     │◄────────────────────────────────────────────────┤
     │                                                │
     │ 4. Store Token in LocalStorage                 │
     │                                                │
     │ 5. API Request with JWT in Header              │
     ├────────────────────────────────►┌──────────────┤
     │                                  │  FastAPI     │
     │ 6. Validate JWT                  │  Backend     │
     │                                  │              │
     │ 7. Check Role (Admin/Supervisor) │              │
     │                                  └──────────────┤
     │ 8. Return Data                                  │
     │◄────────────────────────────────────────────────┤
```

### Authorization Levels

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access, All supervisor data, Create/delete supervisors, System analytics |
| **Supervisor** | Own agents only, Own archives only, Own analytics only, Cannot access other supervisors |

### Security Measures

1. **JWT Tokens:**
   - Issued by Supabase Auth
   - Contains user_id and role
   - Expiration: 1 hour (configurable)
   - Refresh token: 7 days

2. **API Security:**
   - All endpoints require authentication
   - Rate limiting on endpoints
   - Input validation with Pydantic
   - SQL injection prevention (Supabase ORM)

3. **Row-Level Security (Supabase):**
   ```sql
   -- Supervisors can only read their own agents
   CREATE POLICY supervisor_agents_policy ON agents
   FOR SELECT USING (supervisor_id = auth.uid());
   
   -- Admins can read all
   CREATE POLICY admin_all_access ON agents
   FOR ALL USING (
     EXISTS (
       SELECT 1 FROM users 
       WHERE users.id = auth.uid() 
       AND users.role = 'admin'
     )
   );
   ```

4. **WebRTC Security:**
   - LiveKit tokens with room-specific permissions
   - Time-limited access tokens
   - Encrypted media streams (DTLS-SRTP)

---

## Scalability Considerations

### Current Limits (POC)
- **Concurrent calls:** 10 maximum
- **Agents per supervisor:** 3 maximum
- **SSE connections:** 3 per supervisor (one per agent)

### Scaling Strategy (Future)

1. **Horizontal Scaling:**
   - Multiple FastAPI instances behind load balancer
   - LiveKit cluster for increased capacity
   - Supabase automatic scaling

2. **Caching:**
   - Redis for analytics data caching
   - CDN for static assets
   - Browser caching for dashboard data

3. **Database Optimization:**
   - Indexed columns for frequent queries
   - Partitioning for archive tables
   - Read replicas for analytics

---

## Monitoring & Observability

### Metrics to Track

1. **System Metrics:**
   - API response times
   - SSE connection count
   - Database query performance
   - LiveKit room count

2. **Business Metrics:**
   - Active calls/chats
   - Average KPIs (FCR, CSAT, AHT)
   - Agent utilization rate
   - Tool usage statistics

3. **AI Metrics:**
   - Model API response times
   - AI model costs
   - Sentiment accuracy (manual validation)
   - Summary quality scores

### Logging Strategy

```python
# Structured logging with different levels
- ERROR: System failures, exceptions
- WARNING: Timeouts, retries, degraded performance
- INFO: API calls, user actions, state changes
- DEBUG: Detailed execution flow (dev only)
```

### Health Checks

```
GET /health
{
  "status": "healthy",
  "database": "connected",
  "livekit": "connected",
  "ai_services": {
    "gemini": "healthy",
    "groq": "healthy"
  }
}
```

---

## Deployment Architecture

### Development Environment
```
- Local FastAPI server
- Local LiveKit server (Docker)
- Supabase cloud (free tier)
- Frontend dev server (Vite)
```

### Production Environment (Recommended)
```
- FastAPI: Cloud service (Railway, Render, or Fly.io)
- LiveKit: LiveKit Cloud (free tier)
- Supabase: Cloud (free tier)
- Frontend: Vercel or Netlify (PWA)
```

### Environment Variables
```bash
# FastAPI
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_KEY=...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=wss://...

# AI Services
GEMINI_API_KEY=...
GROQ_API_KEY=...

# Security
JWT_SECRET=...
CORS_ORIGINS=http://localhost:3000,https://app.domain.com
```

---

## Technology Justification

| Technology | Reason for Choice |
|------------|-------------------|
| **FastAPI** | Modern, fast, async support, automatic docs, type safety |
| **LiveKit** | Best open-source WebRTC solution, agents SDK, scalable |
| **Supabase** | Postgres + Auth +  Realtime in one, fast setup, free tier |
| **React PWA** | Cross-platform, installable, offline support, familiar |
| **Gemini 2.5 Flash-Lite** | Fast, cost-effective, good quality, Google ecosystem |
| **Groq** | Ultra-fast inference for Whisper and summary models |
| **SSE** | Simpler than WebSocket for one-way real-time updates |

---

## Risk Mitigation

### Technical Risks

| Risk | Mitigation |
|------|------------|
| AI API rate limits | Implement queuing, caching, and graceful degradation |
| LiveKit connection drops | Auto-reconnection logic, fallback mechanisms |
| SSE connection loss | Automatic reconnection with exponential backoff |
| Database performance | Indexing, caching, query optimization |
| Concurrent call limit | Queue system, agent availability checks |

### POC Limitations Awareness

1. **No real phone integration** - Mock interface only
2. **No recordings** - Summary and tags only
3. **Limited scalability** - 10 concurrent calls max
4. **AI costs** - Monitor API usage carefully
5. **Data retention** - Configurable but limited in POC

---

## Next Steps

1. Database schema design
2. API endpoint specification (OpenAPI)
3. Implementation plan with task breakdown
4. Development setup guide
