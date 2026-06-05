# Backend - Customer Service AI Agents Platform

FastAPI backend application for the Customer Service AI Agents Platform.

## 🚀 First Time Setup (For Each Developer)

**Each team member must set up their own local environment. Do NOT commit `.env` or `venv/` to GitHub.**

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd graduation-project/backend
```

### Step 2: Create Virtual Environment

```bash
# Windows
py -m venv venv
venv\Scripts\Activate.ps1

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies

```bash
pip install -r requirements.txt

# For development (optional)
pip install -r requirements-dev.txt
```

### Step 4: Create Environment Variables File

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

### Step 5: Configure Environment Variables

Edit `.env` file with your actual credentials:

```bash
# Get these from your team lead or project manager
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key
SECRET_KEY=your-secret-key-here
# ... etc
```

**⚠️ CRITICAL:** 
- **NEVER commit `.env` to GitHub** (it's in `.gitignore`)
- **NEVER commit `venv/` folder** (each developer creates their own)
- **ONLY commit `.env.example`** (template for others)

## 📋 What Gets Committed to GitHub

✅ **Commit These:**
- `requirements.txt` - All Python dependencies
- `requirements-dev.txt` - Development dependencies
- `.env.example` - Environment variables template
- All code files (`app/`, `tests/`, etc.)
- `Dockerfile`, `pytest.ini`, `README.md`

❌ **Never Commit:**
- `.env` - Contains secrets (already in `.gitignore`)
- `venv/` - Virtual environment (already in `.gitignore`)
- `__pycache__/` - Python cache (already in `.gitignore`)
- Any files with API keys or passwords

### Step 6: Vertex AI voice agent (Gemini Live on GCP)

The voice worker uses **Vertex AI** by default so usage bills to your **GCP project** (including the $300 free trial). AI Studio API keys (`GEMINI_API_KEY`) are not used when `GEMINI_USE_VERTEX=true`.

1. In [Google Cloud Console](https://console.cloud.google.com/), create or select a project with billing (free trial is fine).
2. Enable **Vertex AI API** for that project.
3. Create a service account with role **Vertex AI User**, download JSON, or run:
   ```bash
   gcloud auth application-default login
   ```
4. In `backend/.env` set:
   ```bash
   GEMINI_USE_VERTEX=true
   GOOGLE_CLOUD_PROJECT=your-project-id
   GOOGLE_CLOUD_LOCATION=us-central1
   GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\key.json
   GEMINI_REALTIME_MODEL=gemini-live-2.5-flash-native-audio
   VOICE_PIPELINE=gemini
   ```
5. Start the voice worker:
   ```bash
   python -m app.agents.voice_session_manager dev
   ```

### Step 7: Run the Application

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

## 👥 Team Workflow

### When Starting Work (Daily)

1. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

2. **Check if requirements changed:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Activate your virtual environment:**
   ```bash
   # Windows
   venv\Scripts\Activate.ps1
   
   # Linux/Mac
   source venv/bin/activate
   ```

### When Adding New Dependencies

1. **Add to requirements.txt:**
   ```bash
   pip install <new-package>
   pip freeze > requirements.txt  # Update the file
   ```

2. **Commit the updated requirements.txt:**
   ```bash
   git add requirements.txt
   git commit -m "Add new dependency: <package-name>"
   git push
   ```

3. **Team members pull and install:**
   ```bash
   git pull
   pip install -r requirements.txt
   ```

## Project Structure

```
backend/
├── app/
│   ├── api/          # API endpoints and routes
│   ├── core/         # Configuration and security
│   ├── db/           # Database client
│   ├── models/       # Pydantic models
│   ├── repositories/ # Data access layer
│   └── main.py       # FastAPI application
├── requirements.txt   # Python dependencies
└── .env.example      # Environment variables template
```

## Docker (home server / production)

Runs two containers from one image:

| Service      | Host port | Purpose                                      |
|-------------|-----------|----------------------------------------------|
| `api`       | **8082**  | FastAPI REST API (`/health`, `/docs`, `/v1`) |
| `voice-agent` | **8083** | LiveKit worker health HTTP (not the voice media port) |

The voice worker connects **outbound** to LiveKit Cloud; port 8083 is only for health checks and orchestration.

### Public access: Cloudflare Tunnel + Nginx Proxy Manager

Typical layout (no need to open 8082/8083 on your router):

```
Internet → Cloudflare → cloudflared (home server) → NPM → host:8082 / host:8083
```

Suggested subdomains (replace `yourdomain.com`):

| Subdomain | NPM / tunnel target | Used for |
|-----------|---------------------|----------|
| `api.yourdomain.com` | `http://127.0.0.1:8082` | REST API, `/docs`, Telegram webhooks (`/v1/telegram/...`) |
| `voice.yourdomain.com` | `http://127.0.0.1:8083` | Voice worker health only (optional; useful for monitoring) |
| `app.yourdomain.com` | your frontend host | React PWA (set in `CORS_ORIGINS`) |

**`backend/.env` (production):**

```bash
WEBHOOK_DOMAIN=https://api.yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com,http://localhost:8080
DEBUG=false
```

**`frontend/.env`:**

```bash
VITE_API_BASE_URL=https://api.yourdomain.com/v1
```

**cloudflared** (`config.yml` ingress) — either send traffic to NPM or straight to Docker:

```yaml
ingress:
  - hostname: api.yourdomain.com
    service: http://127.0.0.1:8082
  - hostname: voice.yourdomain.com
    service: http://127.0.0.1:8083
  # If NPM fronts everything instead, point both hostnames at NPM (e.g. http://127.0.0.1:81)
  - service: http_status:404
```

**Nginx Proxy Manager** (if cloudflared → NPM → backends):

1. Proxy Host `api.yourdomain.com` → Forward `http://<docker-host-ip>:8082`, **Websockets ON** (chat/SSE).
2. Proxy Host `voice.yourdomain.com` → Forward `http://<docker-host-ip>:8083`.
3. SSL: often **Flexible** or **Full** at Cloudflare; terminate TLS at Cloudflare or NPM per your tunnel setup.

Keep containers bound to localhost-only exposure if you prefer: change compose ports to `127.0.0.1:8082:8082` so only cloudflared/NPM on the same host can reach them.

### On your Ubuntu server (Core 2 Duo / 6 GB RAM)

1. Install Docker Engine + Compose plugin:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-v2
   sudo usermod -aG docker $USER
   # log out and back in
   ```

2. Clone the repo and configure:
   ```bash
   cd customer_service_agent/backend
   cp .env.example .env
   nano .env   # Supabase, LiveKit, Groq, Vertex settings
   ```

3. Place your GCP service account JSON under `backend/secret-google/` (gitignored), e.g.:
   `secret-google/omniserva-ai-7258b456c513.json`

   ```bash
   mkdir -p secret-google
   cp /path/to/your-key.json secret-google/omniserva-ai-7258b456c513.json
   chmod 600 secret-google/omniserva-ai-7258b456c513.json
   file secret-google/omniserva-ai-7258b456c513.json
   ```

   In `.env` for Docker:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/gcp-credentials.json
   GCP_KEY_FILE=./secret-google/omniserva-ai-7258b456c513.json
   DEBUG=false
   CORS_ORIGINS=https://app.yourdomain.com
   WEBHOOK_DOMAIN=https://api.yourdomain.com
   ```

4. Build and start (first build can take 30–60+ minutes on old CPUs; consider building on a faster PC and `docker save` / `docker load`).

   **Core 2 Duo / pre-SSE4.2 CPUs:** the image pins `numpy<2` because NumPy 2 wheels require x86-64-v2. If build still fails on `numpy`, pull latest `backend/Dockerfile` and rebuild with `docker compose build --no-cache`.
   ```bash
   docker compose up -d --build
   docker compose ps
   curl http://127.0.0.1:8082/health
   curl http://127.0.0.1:8083/
   ```

5. **Firewall:** with Cloudflare Tunnel + NPM you usually **do not** publish 8082/8083 on the WAN; keep them on LAN/localhost only. Test locally: `curl http://127.0.0.1:8082/health`, then `curl https://api.yourdomain.com/health` through the tunnel.

**Memory tips for 6 GB RAM:** enable 2–4 GB swap; keep only these two containers running; if OOM, lower `voice-agent` memory in `docker-compose.yml`. Frontend: `VITE_API_BASE_URL=https://api.yourdomain.com/v1`.

**Troubleshooting**

| Symptom | Fix |
|--------|-----|
| `Credentials file not found: /run/secrets/gcp-credentials.json` | Ensure `secret-google/omniserva-ai-7258b456c513.json` exists on the server (folder is gitignored — copy via `scp`). Then `docker compose up -d`. |
| `curl: Connection reset by peer` on :8082 | API likely OOM: `docker compose logs api --tail 80` and `docker inspect cs-api --format 'OOMKilled={{.State.OOMKilled}}'`. Enable swap; pull latest compose (API limit 1536M). |
| `Couldn't connect` on :8083 | Voice container crash-looping — fix GCP key first, then `docker compose logs voice-agent`. |

## Development

- **Python Version:** 3.10+
- **Framework:** FastAPI
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (JWT)

