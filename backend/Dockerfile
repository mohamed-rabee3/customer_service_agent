# Customer Service Platform — API + LiveKit voice worker (same image, different commands)
# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=3.11.9
FROM python:${PYTHON_VERSION}-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Build + runtime libs for livekit-agents (audio, native wheels)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ python3-dev \
    ffmpeg libsndfile1 curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
# Install NumPy 1.x first so livekit-agents does not pull NumPy 2 (needs SSE4.2 / x86-64-v2).
RUN pip install --no-cache-dir "numpy>=1.26.0,<2.0.0" \
    && pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir --force-reinstall --no-deps "numpy>=1.26.0,<2.0.0"

COPY app ./app

# Bake Silero / turn-detector weights into the image (skip if download fails on very old CPUs)
RUN VOICE_SKIP_STARTUP_CHECKS=1 \
    SUPABASE_URL=https://build.invalid \
    SUPABASE_KEY=build \
    SUPABASE_SERVICE_KEY=build \
    SECRET_KEY=build \
    LIVEKIT_URL=wss://build.invalid \
    LIVEKIT_API_KEY=build \
    LIVEKIT_API_SECRET=build \
    python -m app.agents.voice_session_manager download-files \
    || echo "WARN: download-files failed; voice-agent will fetch models on first start"

EXPOSE 8000 8083

# Default: FastAPI API on 8000 (override in compose for voice worker)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
