# Customer Service AI Agents Platform

A full-stack platform for managing AI-powered customer service agents with real-time voice and chat capabilities.

## Project Structure

```
├── backend/          # FastAPI backend application
├── frontend/         # React PWA frontend application
├── db/              # Database schema and migrations
└── docs/            # Project documentation
```

## Quick Start

### Backend Setup

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Create virtual environment:
   ```bash
   py -m venv venv
   venv\Scripts\Activate.ps1
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment:
   ```bash
   copy .env.example .env
   # Edit .env with your credentials
   ```

5. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup

See `frontend/README.md` for frontend setup instructions.

## Documentation

- `docs/05_folder_structure.md` - Complete project structure
- `docs/04_openapi_spec.yaml` - API specification
- `backend/README.md` - Backend documentation
- `SETUP_GUIDE.md` - Detailed setup guide

## Features

- ✅ JWT Authentication via Supabase
- ✅ Row-Level Security (RLS) policies
- ✅ Real-time agent metrics
- ✅ Voice and chat AI agents
- ✅ Supervisor dashboard
- ✅ Admin management

## Tech Stack

- **Backend:** FastAPI, Supabase, LiveKit
- **Frontend:** React, TypeScript, Vite
- **Database:** PostgreSQL (via Supabase)
- **AI:** Gemini, Groq

## License

[Your License Here]
