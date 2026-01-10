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
copy .env .env

# Linux/Mac
cp .env .env
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

### Step 6: Run the Application

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

## Development

- **Python Version:** 3.10+
- **Framework:** FastAPI
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth (JWT)

