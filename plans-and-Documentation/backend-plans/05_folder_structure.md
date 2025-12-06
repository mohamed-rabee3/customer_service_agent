# Project Folder Structure & File Hierarchy

## Overview

This document describes the complete folder and file structure for the **Customer Service AI Agents Platform**. The project consists of two main parts:

1. **Backend** - FastAPI application with LiveKit Agents integration
2. **Frontend** - React PWA application

---

## Root Project Structure

```
customer_service_platform/
├── backend/                    # FastAPI backend application
├── frontend/                   # React PWA frontend application
├── docs/                       # Project documentation
├── scripts/                    # Utility scripts
├── .gitignore                  # Git ignore rules
├── docker-compose.yml          # Docker compose for local development
└── README.md                   # Project overview and setup instructions
```

---

## Backend Structure (FastAPI)

```
backend/
│
├── app/                                    # Main application package
│   ├── __init__.py                         # Package initializer
│   ├── main.py                             # FastAPI application entry point
│   │
│   ├── core/                               # Core configuration and utilities
│   │   ├── __init__.py
│   │   ├── config.py                       # Application settings (env variables)
│   │   ├── security.py                     # JWT validation, password strength helper functions
│   │   ├── exceptions.py                   # Custom exception classes
│   │   └── constants.py                    # Application constants
│   │
│   ├── api/                                # API layer (routes/endpoints)
│   │   ├── __init__.py
│   │   ├── deps.py                         # Shared API dependencies
│   │   │
│   │   └── v1/                             # API version 1
│   │       ├── __init__.py
│   │       ├── router.py                   # Main router aggregating all routes
│   │       │
│   │       ├── endpoints/                  # Individual endpoint modules
│   │       │   ├── __init__.py
│   │       │   ├── auth.py                 # /auth/* endpoints (login, me, refresh)
│   │       │   ├── admin.py                # /admin/* endpoints (dashboard, analytics)
│   │       │   ├── supervisors.py          # /supervisors/* endpoints (CRUD, dashboard)
│   │       │   ├── agents.py               # /agents/* endpoints (CRUD, whisper)
│   │       │   ├── interactions.py         # /interactions/* endpoints (list, create, update)
│   │       │   ├── archives.py             # /archives/* endpoints (list, detail, tags)
│   │       │   ├── analytics.py            # /analytics/* endpoints (supervisor, agent stats)
│   │       │   ├── realtime.py             # /realtime/* SSE endpoints (metrics, notifications)
│   │       │   └── tools.py                # /tools/* endpoints (permission responses)
│   │       │
│   │       └── schemas/                    # Request/Response Pydantic schemas per endpoint
│   │           ├── __init__.py
│   │           ├── auth.py                 # Auth request/response schemas
│   │           ├── admin.py                # Admin schemas
│   │           ├── supervisor.py           # Supervisor schemas
│   │           ├── agent.py                # Agent schemas
│   │           ├── interaction.py          # Interaction schemas
│   │           ├── archive.py              # Archive schemas
│   │           ├── analytics.py            # Analytics schemas
│   │           ├── realtime.py             # Realtime metrics schemas
│   │           └── tools.py                # Tool permission schemas
│   │
│   ├── models/                             # Database models (Pydantic for Supabase)
│   │   ├── __init__.py
│   │   ├── user.py                         # User model
│   │   ├── agent.py                        # AI Agent model
│   │   ├── interaction.py                  # Interaction (call/chat) model
│   │   ├── archive.py                      # Interaction archive model
│   │   ├── realtime_metrics.py             # Real-time metrics model
│   │   ├── tool_permission.py              # Tool permission model
│   │   └── agent_tool.py                   # Agent tool configuration model
│   │
│   ├── services/                           # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py                 # Authentication logic (Supabase Auth)
│   │   ├── admin_service.py                # Admin operations (supervisor management)
│   │   ├── supervisor_service.py           # Supervisor CRUD and dashboard data
│   │   ├── agent_service.py                # Agent CRUD, status management
│   │   ├── interaction_service.py          # Interaction lifecycle management
│   │   ├── archive_service.py              # Archive retrieval and tag updates
│   │   ├── analytics_service.py            # KPI calculations (FCR, CSAT, AHT, Performance)
│   │   ├── realtime_service.py             # SSE stream management
│   │   ├── tool_service.py                 # Tool permission handling
│   │   └── whisper_service.py              # Whisper instruction injection logic
│   │
│   ├── repositories/                       # Data access layer (Supabase queries)
│   │   ├── __init__.py
│   │   ├── base.py                         # Base repository class
│   │   ├── user_repository.py              # User data operations
│   │   ├── admin_repository.py             # Admin data operations
│   │   ├── supervisor_repository.py        # Supervisor data operations
│   │   ├── agent_repository.py             # Agent data operations
│   │   ├── interaction_repository.py       # Interaction data operations
│   │   ├── archive_repository.py           # Archive data operations
│   │   ├── metrics_repository.py           # Real-time metrics operations
│   │   └── tool_permission_repository.py   # Tool permission operations
│   │
│   ├── db/                                 # Database configuration
│   │   ├── __init__.py
│   │   ├── supabase.py                     # Supabase client initialization
│   │   └── migrations/                     # SQL migration scripts
│   │       ├── 001_initial_schema.sql      # Initial table creation
│   │       ├── 002_indexes.sql             # Performance indexes
│   │       ├── 003_views.sql               # Analytics views
│   │       ├── 004_rls_policies.sql        # Row-level security policies
│   │       ├── 005_functions.sql           # Database functions (FCR, performance)
│   │       └── 006_seed_data.sql           # Development seed data
│   │
│   ├── livekit/                            # LiveKit integration
│   │   ├── __init__.py
│   │   ├── client.py                       # LiveKit server API client
│   │   ├── token_service.py                # JWT token generation for LiveKit rooms
│   │   ├── room_manager.py                 # Room creation, deletion, management
│   │   └── events.py                       # LiveKit event handlers
│   │
│   ├── agents/                             # LiveKit Agents SDK integration
│   │   ├── __init__.py
│   │   ├── base_agent.py                   # Base agent class with common functionality
│   │   ├── voice_agent.py                  # Voice agent implementation (STT, LLM, TTS)
│   │   ├── chat_agent.py                   # Chat agent implementation (LLM only)
│   │   ├── agent_runner.py                 # Agent lifecycle management
│   │   │
│   │   ├── llm/                            # LLM integrations
│   │   │   ├── __init__.py
│   │   │   ├── gemini.py                   # Gemini 2.5 Flash-Lite integration
│   │   │   └── groq.py                     # Groq API integration (summary, tags)
│   │   │
│   │   ├── stt/                            # Speech-to-Text
│   │   │   ├── __init__.py
│   │   │   └── whisper.py                  # Whisper v3 Large via Groq
│   │   │
│   │   ├── tts/                            # Text-to-Speech
│   │   │   ├── __init__.py
│   │   │   └── gemini_tts.py               # Gemini 2.5 Flash Preview TTS
│   │   │
│   │   ├── tools/                          # MCP Tools for agents
│   │   │   ├── __init__.py
│   │   │   ├── base_tool.py                # Base tool class
│   │   │   ├── tool_registry.py            # Tool registration and management
│   │   │   ├── customer_tools.py           # Customer data tools
│   │   │   └── phone_validator.py          # Phone number validation tool
│   │   │
│   │   └── processors/                     # Real-time AI processors
│   │       ├── __init__.py
│   │       ├── sentiment_analyzer.py       # Real-time sentiment analysis
│   │       ├── satisfaction_scorer.py      # Real-time satisfaction scoring
│   │       ├── feed_generator.py           # Conversation feed generation
│   │       └── post_call_processor.py      # Summary, tags, CSAT generation
│   │
│   └── utils/                              # Utility functions
│       ├── __init__.py
│       ├── validators.py                   # Input validation helpers
│       ├── formatters.py                   # Data formatting utilities
│       ├── datetime_utils.py               # Date/time helpers
│       └── logging.py                      # Logging configuration
│
├── tests/                                  # Test suite
│   ├── __init__.py
│   ├── conftest.py                         # Pytest fixtures and configuration
│   │
│   ├── unit/                               # Unit tests
│   │   ├── __init__.py
│   │   ├── test_services/                  # Service layer tests
│   │   ├── test_repositories/              # Repository layer tests
│   │   └── test_utils/                     # Utility function tests
│   │
│   ├── integration/                        # Integration tests
│   │   ├── __init__.py
│   │   ├── test_api/                       # API endpoint tests
│   │   ├── test_livekit/                   # LiveKit integration tests
│   │   └── test_db/                        # Database tests
│   │
│   └── e2e/                                # End-to-end tests
│       ├── __init__.py
│       └── test_flows/                     # Complete flow tests
│
├── requirements.txt                        # Python dependencies
├── requirements-dev.txt                    # Development dependencies
├── .env.example                            # Environment variables template
├── Dockerfile                              # Docker image configuration
├── pytest.ini                              # Pytest configuration
└── README.md                               # Backend documentation
```

---

## Backend Files Description

### Core Module (`app/core/`)

| File | Purpose |
|------|---------|
| `config.py` | Uses `pydantic-settings` with `BaseSettings` and `SettingsConfigDict` for type-safe environment variable loading. Supports `.env` files, env prefixes, and nested config. Contains `SUPABASE_URL`, `SUPABASE_KEY`, `LIVEKIT_API_KEY`, `GEMINI_API_KEY`, etc. |
| `security.py` | JWT token validation with Supabase Auth, password hashing utilities, role-based access control decorators |
| `exceptions.py` | Custom exception classes: `UnauthorizedException`, `ForbiddenException`, `NotFoundException`, `ValidationException`, `AgentBusyException` |
| `constants.py` | Application constants: max agents per supervisor (3), max supervisors on dashboard (15), sentiment values, status enums |

**Example `config.py` structure (pydantic-settings v2):**
```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        case_sensitive=False
    )
    
    # Supabase
    supabase_url: str
    supabase_key: str
    supabase_service_key: str
    
    # LiveKit
    livekit_url: str
    livekit_api_key: str
    livekit_api_secret: str
    
    # AI Services
    gemini_api_key: str
    groq_api_key: str

settings = Settings()
```

### API Endpoints (`app/api/v1/endpoints/`)

| File | Purpose | Endpoints |
|------|---------|-----------|
| `auth.py` | User authentication | `POST /auth/login`, `GET /auth/me`, `POST /auth/refresh` |
| `admin.py` | Admin-only operations | `GET /admin/dashboard`, `GET /admin/analytics` |
| `supervisors.py` | Supervisor management | `GET/POST /supervisors`, `GET/PUT/DELETE /supervisors/{id}`, `GET /supervisors/me/dashboard` |
| `agents.py` | Agent management | `GET/POST /agents`, `GET/PUT/DELETE /agents/{id}`, `GET /agents/{id}/status`, `POST /agents/{id}/whisper` |
| `interactions.py` | Call/Chat management | `GET/POST /interactions`, `GET/PATCH /interactions/{id}` |
| `archives.py` | Historical data | `GET /archives`, `GET/PATCH /archives/{id}` |
| `analytics.py` | Performance metrics | `GET /analytics/supervisor/{id}`, `GET /analytics/agent/{id}` |
| `realtime.py` | SSE streams | `GET /realtime/agent/{id}/metrics`, `GET /realtime/supervisor/notifications` |
| `tools.py` | Tool permissions | `POST /tools/permissions/{id}/respond`, `GET /tools/permissions/interaction/{id}` |

### Services (`app/services/`)

| File | Purpose |
|------|---------|
| `auth_service.py` | Authenticate users via Supabase Auth, generate/validate tokens, handle refresh tokens |
| `admin_service.py` | Get active supervisors, generate leaderboard (top 5), aggregate system analytics |
| `supervisor_service.py` | CRUD operations for supervisors, get supervisor dashboard data with all agents |
| `agent_service.py` | CRUD operations for agents (max 3 per supervisor), status management, configuration validation |
| `interaction_service.py` | Start new interactions, find idle agents, manage interaction lifecycle |
| `archive_service.py` | Query historical interactions with filters, update tags |
| `analytics_service.py` | Calculate KPIs: FCR percentage, average CSAT, average handle time, performance score with weights |
| `realtime_service.py` | Manage SSE connections, broadcast metrics updates every 5 seconds |
| `tool_service.py` | Handle tool permission requests, timeout logic (1m, 3m, 6m alerts), permission responses |
| `whisper_service.py` | Send whisper instructions to agents, pause/resume agent conversation |

### Repositories (`app/repositories/`)

| File | Purpose |
|------|---------|
| `base.py` | Base repository with common CRUD operations for Supabase |
| `user_repository.py` | Query users table, role checking |
| `admin_repository.py` | Query admins table |
| `supervisor_repository.py` | Query supervisors with pagination, filtering by type |
| `agent_repository.py` | Query agents by supervisor, status updates, agent count validation |
| `interaction_repository.py` | Query interactions with filters, status updates, duration calculation |
| `archive_repository.py` | Query archives with search (phone, date, tags), tag updates |
| `metrics_repository.py` | Insert/query real-time metrics, cleanup old records |
| `tool_permission_repository.py` | Track permission requests, update responses |

**Supabase Client Pattern (`app/db/supabase.py`):**
```python
import os
from supabase import create_client, Client
from supabase import acreate_client, AsyncClient  # For realtime/async operations

# Sync client for regular operations
def get_supabase_client() -> Client:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    return create_client(url, key)

# Async client for realtime operations
async def get_async_supabase_client() -> AsyncClient:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    return await acreate_client(url, key)

supabase = get_supabase_client()
```

### LiveKit Integration (`app/livekit/`)

| File | Purpose |
|------|---------|
| `client.py` | LiveKit Server SDK client for room management API calls |
| `token_service.py` | Generate JWT tokens for customers and supervisors to join LiveKit rooms |
| `room_manager.py` | Create rooms for new interactions, delete rooms on completion, get room status |
| `events.py` | Handle LiveKit webhook events (participant joined, left, room ended) |

### AI Agents (`app/agents/`)

| File | Purpose |
|------|---------|
| `base_agent.py` | Base `Agent` class with instructions, tools, and common functionality |
| `voice_agent.py` | Voice agent using `AgentSession` with STT/LLM/TTS plugins pipeline |
| `chat_agent.py` | Chat agent using `AgentSession` with LLM only |
| `agent_runner.py` | `WorkerOptions` and `cli.run_app()` for agent lifecycle management |
| `llm/gemini.py` | Gemini 2.5 Flash-Lite plugin for conversation LLM |
| `llm/groq.py` | Groq API plugin for post-call summary and tag generation |
| `stt/whisper.py` | Whisper v3 Large via Groq using `livekit.plugins` pattern |
| `tts/gemini_tts.py` | Gemini 2.5 Flash Preview TTS plugin |
| `tools/base_tool.py` | Base class for MCP tools using `@function_tool` decorator |
| `tools/tool_registry.py` | Register and lookup tools from agent configuration |
| `processors/sentiment_analyzer.py` | Analyze sentiment every 5 seconds (good/neutral/critical) |
| `processors/satisfaction_scorer.py` | Calculate satisfaction score every 5 seconds (0-100%) |
| `processors/feed_generator.py` | Generate short conversation summary sentences |
| `processors/post_call_processor.py` | Generate final summary, issues, tags, CSAT after call ends |

**Example Voice Agent structure (LiveKit Agents SDK):**
```python
from livekit.agents import (
    Agent, AgentSession, JobContext, WorkerOptions, cli, function_tool, RunContext
)
from livekit.plugins import silero, deepgram, openai

@function_tool
async def get_customer_details(context: RunContext, customer_id: str):
    """Fetch customer details - requires supervisor permission."""
    # Request permission, then execute
    return {"name": "John Doe", "account": "12345"}

async def entrypoint(ctx: JobContext):
    await ctx.connect()
    
    agent = Agent(
        instructions="You are a helpful customer service agent...",
        tools=[get_customer_details],
    )
    
    session = AgentSession(
        vad=silero.VAD.load(),
        stt=deepgram.STT(model="nova-3"),
        llm=openai.LLM(model="gpt-4o-mini"),  # Or Gemini
        tts=openai.TTS(voice="echo"),  # Or Gemini TTS
    )
    
    await session.start(agent=agent, room=ctx.room)
    await session.generate_reply(instructions="greet the customer")

if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
```

---

## Frontend Structure (React PWA)

```
frontend/
│
├── public/                                 # Static public assets
│   ├── index.html                          # HTML entry point
│   ├── manifest.json                       # PWA manifest configuration
│   ├── favicon.ico                         # App favicon
│   ├── robots.txt                          # Search engine rules
│   │
│   └── icons/                              # PWA icons
│       ├── icon-192x192.png                # Android icon
│       ├── icon-512x512.png                # Large icon
│       └── apple-touch-icon.png            # iOS icon
│
├── src/                                    # Source code
│   ├── main.tsx                            # React app entry point
│   ├── App.tsx                             # Root component with routing
│   ├── vite-env.d.ts                       # Vite type declarations
│   │
│   ├── api/                                # API client layer
│   │   ├── index.ts                        # API client exports
│   │   ├── client.ts                       # Axios/Fetch client configuration
│   │   ├── auth.ts                         # Auth API calls (login, me, refresh)
│   │   ├── admin.ts                        # Admin API calls (dashboard, analytics)
│   │   ├── supervisors.ts                  # Supervisor API calls
│   │   ├── agents.ts                       # Agent API calls
│   │   ├── interactions.ts                 # Interaction API calls
│   │   ├── archives.ts                     # Archive API calls
│   │   ├── analytics.ts                    # Analytics API calls
│   │   ├── realtime.ts                     # SSE connection management
│   │   └── tools.ts                        # Tool permission API calls
│   │
│   ├── types/                              # TypeScript type definitions
│   │   ├── index.ts                        # Type exports
│   │   ├── user.ts                         # User, Admin, Supervisor types
│   │   ├── agent.ts                        # Agent types
│   │   ├── interaction.ts                  # Interaction types
│   │   ├── archive.ts                      # Archive types
│   │   ├── analytics.ts                    # Analytics types
│   │   ├── realtime.ts                     # Real-time metrics types
│   │   └── api.ts                          # API response types
│   │
│   ├── hooks/                              # Custom React hooks
│   │   ├── index.ts                        # Hook exports
│   │   ├── useAuth.ts                      # Authentication hook
│   │   ├── useAgents.ts                    # Agent data management
│   │   ├── useInteractions.ts              # Interaction data management
│   │   ├── useArchives.ts                  # Archive data management
│   │   ├── useAnalytics.ts                 # Analytics data fetching
│   │   ├── useSSE.ts                       # SSE connection management
│   │   ├── useNotifications.ts             # Tool permission notifications
│   │   ├── useLiveKit.ts                   # LiveKit room connection
│   │   └── useDebounce.ts                  # Debounce utility hook
│   │
│   ├── context/                            # React Context providers
│   │   ├── index.ts                        # Context exports
│   │   ├── AuthContext.tsx                 # Authentication state provider
│   │   ├── AgentContext.tsx                # Agent state provider
│   │   ├── NotificationContext.tsx         # Notification state provider
│   │   └── ThemeContext.tsx                # Theme (dark/light) provider
│   │
│   ├── stores/                             # State management (Zustand)
│   │   ├── index.ts                        # Store exports
│   │   ├── authStore.ts                    # Auth state (user, token)
│   │   ├── agentStore.ts                   # Agent state (list, status)
│   │   ├── interactionStore.ts             # Active interactions state
│   │   ├── notificationStore.ts            # Notifications state
│   │   └── metricsStore.ts                 # Real-time metrics state
│   │
│   ├── pages/                              # Page components (routes)
│   │   ├── index.ts                        # Page exports
│   │   │
│   │   ├── auth/                           # Authentication pages
│   │   │   ├── LoginPage.tsx               # Login form page
│   │   │   └── LogoutPage.tsx              # Logout handling
│   │   │
│   │   ├── admin/                          # Admin pages
│   │   │   ├── AdminLayout.tsx             # Admin layout wrapper
│   │   │   ├── DashboardPage.tsx           # Admin dashboard (supervisor cards, leaderboard)
│   │   │   ├── SupervisorManagementPage.tsx # Supervisor table with CRUD
│   │   │   ├── AnalyticsPage.tsx           # System-wide analytics
│   │   │   └── SupervisorArchivePage.tsx   # View supervisor's archives
│   │   │
│   │   ├── supervisor/                     # Supervisor pages
│   │   │   ├── SupervisorLayout.tsx        # Supervisor layout wrapper
│   │   │   ├── DashboardPage.tsx           # Supervisor dashboard (agent cards)
│   │   │   ├── ArchivePage.tsx             # Call/Chat archive list
│   │   │   ├── ArchiveDetailPage.tsx       # Archive popup detail view
│   │   │   └── AgentConfigPage.tsx         # Agent configuration page
│   │   │
│   │   └── customer/                       # Customer mock app pages
│   │       ├── CustomerLayout.tsx          # Customer app layout
│   │       └── PhoneAppPage.tsx            # Mock phone dialer interface
│   │
│   ├── components/                         # Reusable UI components
│   │   ├── index.ts                        # Component exports
│   │   │
│   │   ├── common/                         # Shared components
│   │   │   ├── Button.tsx                  # Styled button component
│   │   │   ├── Card.tsx                    # Card container component
│   │   │   ├── Modal.tsx                   # Modal dialog component
│   │   │   ├── Input.tsx                   # Form input component
│   │   │   ├── Select.tsx                  # Dropdown select component
│   │   │   ├── Table.tsx                   # Data table component
│   │   │   ├── Loader.tsx                  # Loading spinner
│   │   │   ├── Badge.tsx                   # Status badge component
│   │   │   ├── ProgressBar.tsx             # Progress/percentage bar
│   │   │   ├── Toast.tsx                   # Toast notification
│   │   │   ├── Sidebar.tsx                 # Sidebar navigation
│   │   │   ├── Header.tsx                  # Page header
│   │   │   └── Pagination.tsx              # Pagination controls
│   │   │
│   │   ├── admin/                          # Admin-specific components
│   │   │   ├── SupervisorCard.tsx          # Active supervisor card
│   │   │   ├── SupervisorCardSlider.tsx    # Horizontal card slider (max 15)
│   │   │   ├── Leaderboard.tsx             # Top 5 supervisors leaderboard
│   │   │   ├── LeaderboardRow.tsx          # Single leaderboard entry
│   │   │   ├── SupervisorTable.tsx         # Supervisor management table
│   │   │   ├── SupervisorForm.tsx          # Create/Edit supervisor form
│   │   │   ├── AnalyticsCard.tsx           # KPI display card
│   │   │   └── AnalyticsToggle.tsx         # Voice/Chat toggle switch
│   │   │
│   │   ├── supervisor/                     # Supervisor-specific components
│   │   │   ├── AgentCard.tsx               # Agent status card with metrics
│   │   │   ├── AgentCardGrid.tsx           # Grid of agent cards (max 3)
│   │   │   ├── SentimentIndicator.tsx      # Sentiment display (good/neutral/critical)
│   │   │   ├── SatisfactionBar.tsx         # Satisfaction percentage bar
│   │   │   ├── FeedDisplay.tsx             # Real-time conversation feed
│   │   │   ├── WhisperButton.tsx           # Whisper instruction button
│   │   │   ├── WhisperModal.tsx            # Whisper instruction input modal
│   │   │   ├── NotificationSidebar.tsx     # Tool permission notifications
│   │   │   ├── NotificationItem.tsx        # Single notification with actions
│   │   │   ├── ArchiveCard.tsx             # Archive list card
│   │   │   ├── ArchiveDetailModal.tsx      # Archive popup with full details
│   │   │   ├── ArchiveFilters.tsx          # Archive search/filter controls
│   │   │   ├── TagEditor.tsx               # Edit archive tags
│   │   │   ├── AgentConfigCard.tsx         # Agent configuration display
│   │   │   ├── AgentConfigForm.tsx         # Agent creation/edit form
│   │   │   ├── MCPToolsEditor.tsx          # JSON editor for MCP tools
│   │   │   └── SystemPromptEditor.tsx      # Textarea for system prompt
│   │   │
│   │   └── customer/                       # Customer app components
│   │       ├── Dialer.tsx                  # Phone number dialer keypad
│   │       ├── CallControls.tsx            # Call/end call buttons
│   │       ├── CallStatus.tsx              # Call status display
│   │       └── ChatInterface.tsx           # Chat message interface
│   │
│   ├── layouts/                            # Layout components
│   │   ├── MainLayout.tsx                  # Main app layout with nav
│   │   ├── AuthLayout.tsx                  # Auth pages layout
│   │   └── CustomerLayout.tsx              # Customer app layout
│   │
│   ├── routes/                             # Routing configuration
│   │   ├── index.tsx                       # Route definitions
│   │   ├── ProtectedRoute.tsx              # Auth-protected route wrapper
│   │   ├── AdminRoute.tsx                  # Admin-only route wrapper
│   │   └── SupervisorRoute.tsx             # Supervisor-only route wrapper
│   │
│   ├── lib/                                # Third-party library integrations
│   │   ├── supabase.ts                     # Supabase client for realtime
│   │   ├── livekit.ts                      # LiveKit client configuration
│   │   └── axios.ts                        # Axios instance with interceptors
│   │
│   ├── utils/                              # Utility functions
│   │   ├── index.ts                        # Utility exports
│   │   ├── formatters.ts                   # Date, time, duration formatting
│   │   ├── validators.ts                   # Form validation helpers
│   │   ├── storage.ts                      # LocalStorage helpers
│   │   └── constants.ts                    # Frontend constants
│   │
│   └── styles/                             # Global styles
│       ├── index.css                       # Main CSS entry point
│       ├── variables.css                   # CSS custom properties
│       ├── globals.css                     # Global styles and resets
│       └── components/                     # Component-specific styles
│           ├── buttons.css
│           ├── cards.css
│           ├── forms.css
│           └── tables.css
│
├── package.json                            # NPM dependencies and scripts
├── package-lock.json                       # Dependency lock file
├── vite.config.ts                          # Vite build configuration (with PWA plugin)
├── tsconfig.json                           # TypeScript configuration
├── tsconfig.node.json                      # Node TypeScript config
├── tailwind.config.js                      # Tailwind CSS configuration
├── postcss.config.js                       # PostCSS configuration
├── .env.example                            # Environment variables template
├── .eslintrc.cjs                           # ESLint configuration
├── .prettierrc                             # Prettier configuration
├── vite-env.d.ts                           # Vite environment type declarations
└── README.md                               # Frontend documentation
```

---

## Frontend Files Description

### API Layer (`src/api/`)

| File | Purpose |
|------|---------|
| `client.ts` | Configures Axios/Fetch with base URL (relative URLs), auth headers (JWT), error interceptors, token refresh |
| `auth.ts` | `login()`, `getCurrentUser()`, `refreshToken()` - calls `/auth/*` endpoints |
| `admin.ts` | `getDashboard()`, `getAnalytics()` - calls `/admin/*` endpoints |
| `supervisors.ts` | CRUD functions for supervisors, `getSupervisorDashboard()` |
| `agents.ts` | CRUD functions for agents, `sendWhisper()` |
| `interactions.ts` | `listInteractions()`, `createInteraction()`, `updateInteraction()` |
| `archives.ts` | `listArchives()`, `getArchiveDetail()`, `updateTags()` |
| `analytics.ts` | `getSupervisorAnalytics()`, `getAgentAnalytics()` |
| `realtime.ts` | SSE connection setup, event listeners for metrics and notifications |
| `tools.ts` | `respondToPermission()` - allow/deny tool requests |

**Note:** All API URLs should be relative (e.g., `/v1/auth/login` not `http://localhost:8000/v1/auth/login`)

### State Management - Zustand Stores (`src/stores/`)

**Example `authStore.ts` pattern:**
```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface User {
  id: string;
  email: string;
  role: 'admin' | 'supervisor';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

### Custom Hooks (`src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useAuth.ts` | Manages authentication state, login/logout functions, token storage |
| `useAgents.ts` | Fetches and manages agent list, handles agent updates |
| `useInteractions.ts` | Manages active interactions, status updates |
| `useArchives.ts` | Pagination, filtering, and fetching archive data |
| `useAnalytics.ts` | Fetches KPIs with period filtering (today/month) |
| `useSSE.ts` | Establishes SSE connections, handles events, auto-reconnect |
| `useNotifications.ts` | Manages tool permission notifications with timeout tracking |
| `useLiveKit.ts` | Wraps `@livekit/components-react` hooks for room connection |

**LiveKit React Hooks (from `@livekit/components-react`):**
```typescript
// These hooks are used internally in useLiveKit.ts and customer components
import { 
  useLiveKitRoom,      // Access Room object and HTML props
  useMediaDevices,     // Get available camera/microphone devices
  useMediaDeviceSelect, // Select and activate media devices
  useStartAudio,       // Start audio playback for a room
  useFocusToggle,      // Manage focus state of participant's track
  useGridLayout,       // Calculate grid layout for tracks
} from '@livekit/components-react';
```

### Page Components (`src/pages/`)

| Page | Purpose |
|------|---------|
| `LoginPage.tsx` | Login form with email/password, redirects based on role |
| `admin/DashboardPage.tsx` | Shows active supervisor cards (max 15), leaderboard (top 5) |
| `admin/SupervisorManagementPage.tsx` | Table of all supervisors with create/edit/delete actions |
| `admin/AnalyticsPage.tsx` | System-wide KPIs with voice/chat toggle |
| `supervisor/DashboardPage.tsx` | Shows agent cards (max 3) with real-time metrics, notification sidebar |
| `supervisor/ArchivePage.tsx` | Archive list with filters (date, phone, tags) |
| `supervisor/AgentConfigPage.tsx` | Create/edit agents with system prompt and MCP tools |
| `customer/PhoneAppPage.tsx` | Mock dialer for initiating calls/chats |

### Key Components (`src/components/`)

| Component | Purpose |
|-----------|---------|
| `SupervisorCard.tsx` | Displays supervisor name, type, performance bar, active/total/failed counts |
| `SupervisorCardSlider.tsx` | Horizontal scrollable container for supervisor cards |
| `Leaderboard.tsx` | Table showing top 5 supervisors by performance |
| `AgentCard.tsx` | Shows agent name, status, sentiment, satisfaction bar, feed text, action buttons |
| `WhisperModal.tsx` | Modal for typing and injecting whisper instructions |
| `NotificationSidebar.tsx` | Lists tool permission requests with allow/deny buttons, timeout indicators |
| `ArchiveCard.tsx` | Card showing phone, date, time range, duration, tags |
| `ArchiveDetailModal.tsx` | Full details: summary, issues, tags (editable), CSAT, resolution time |
| `AgentConfigForm.tsx` | Form with name input, system prompt textarea, MCP tools JSON editor |
| `Dialer.tsx` | Numeric keypad for entering mock phone numbers |

---

## Shared Files (Root)

```
customer_service_platform/
│
├── docs/                                   # Documentation folder
│   ├── 01_enhanced_project_description.md  # Project overview
│   ├── 02_system_architecture.md           # Architecture diagrams
│   ├── 03_database_schema.md               # Database design
│   ├── 04_openapi_spec.yaml                # API specification
│   └── 05_folder_structure.md              # This file
│
├── scripts/                                # Utility scripts
│   ├── setup_dev.sh                        # Development environment setup
│   ├── run_migrations.sh                   # Run database migrations
│   └── seed_data.py                        # Seed development data
│
├── .gitignore                              # Git ignore patterns
├── docker-compose.yml                      # Local development services
│                                           # (LiveKit, PostgreSQL if not using Supabase cloud)
└── README.md                               # Project README with setup instructions
```

---

## Environment Variables

### Backend (`.env`)

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key

# LiveKit
LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret

# AI Services
GEMINI_API_KEY=your-gemini-api-key
GROQ_API_KEY=your-groq-api-key

# Application
DEBUG=true
CORS_ORIGINS=http://localhost:5173
```

### Frontend (`.env`)

```bash
# API
VITE_API_BASE_URL=http://localhost:8000/v1

# Supabase (for realtime only)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# LiveKit (for customer app)
VITE_LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
```

---

## Summary

| Layer | Technology | Main Responsibility |
|-------|------------|---------------------|
| **Frontend** | React + TypeScript + Vite | User interfaces for admin, supervisor, customer |
| **API Layer** | FastAPI | REST endpoints, SSE streams, business logic |
| **Real-time** | LiveKit + SSE | WebRTC audio/video, real-time metrics |
| **Database** | Supabase (PostgreSQL) | Data persistence, auth, realtime subscriptions |
| **AI Agents** | LiveKit Agents SDK | Voice/Chat AI agent processing |
| **AI Services** | Gemini, Groq | LLM, TTS, STT, sentiment analysis |

---

## Development Workflow

1. **Backend First**: Set up database schema, implement repositories, then services, then API endpoints
2. **Agent Development**: Implement base agent, then voice agent with STT/LLM/TTS, then chat agent
3. **Frontend**: Build common components, then pages per role (admin → supervisor → customer)
4. **Integration**: Connect frontend to API, set up SSE connections, integrate LiveKit
5. **Testing**: Unit tests for services, integration tests for API, e2e tests for flows

---

## File Count Summary

| Section | Folders | Files |
|---------|---------|-------|
| Backend | ~25 | ~85 |
| Frontend | ~20 | ~90 |
| Docs/Scripts | ~3 | ~10 |
| **Total** | **~48** | **~185** |

This structure follows best practices for:
- **Separation of concerns**: API, services, repositories, models
- **Scalability**: Easy to add new features without modifying existing code
- **Testability**: Each layer can be tested independently
- **Maintainability**: Clear file naming and organization

---

## Key Dependencies

### Backend (`requirements.txt`)

```txt
# FastAPI & Server
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
python-multipart>=0.0.9

# Pydantic & Settings
pydantic>=2.9.0
pydantic-settings>=2.5.0

# Supabase
supabase>=2.9.0

# LiveKit
livekit>=0.17.0
livekit-agents>=0.12.0
livekit-plugins-openai>=0.10.0
livekit-plugins-deepgram>=0.7.0
livekit-plugins-silero>=0.7.0

# AI Services
google-generativeai>=0.8.0
groq>=0.11.0

# SSE
sse-starlette>=2.1.0

# Utilities
python-dotenv>=1.0.0
httpx>=0.27.0
```

### Frontend (`package.json` key dependencies)

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^7.0.0",
    "@livekit/components-react": "^2.6.0",
    "livekit-client": "^2.6.0",
    "@supabase/supabase-js": "^2.45.0",
    "zustand": "^5.0.0",
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite-plugin-pwa": "^0.20.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^9.0.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0"
  }
}
```

---

## Validation Checklist

Before implementation, verify:

- [ ] Backend structure follows FastAPI best practices (routers, schemas, services, repositories)
- [ ] `pydantic-settings` v2 is used for configuration with `BaseSettings` and `SettingsConfigDict`
- [ ] LiveKit Agents SDK pattern is followed (`Agent`, `AgentSession`, `JobContext`, `@function_tool`)
- [ ] Frontend uses `@livekit/components-react` for LiveKit integration
- [ ] Zustand stores use TypeScript interfaces and persist middleware where needed
- [ ] All API URLs are relative (not absolute)
- [ ] PWA manifest and service worker are configured via Vite PWA plugin
- [ ] Environment type declarations exist in `vite-env.d.ts`

