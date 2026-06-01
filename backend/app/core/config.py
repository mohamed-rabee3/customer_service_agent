"""Application configuration using pydantic-settings v2."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Supabase Configuration
    supabase_url: str
    supabase_key: str
    supabase_service_key: str

    # Application Security
    secret_key: str
    debug: bool = False

    # CORS Configuration
    cors_origins: str = "*"

    # LiveKit Configuration
    livekit_url: str = ""
    livekit_api_key: str = ""
    livekit_api_secret: str = ""

    # AI Services — Vertex AI Gemini (voice worker; bills to GCP / free trial)
    gemini_use_vertex: bool = True
    google_cloud_project: str = ""
    google_cloud_location: str = "us-central1"
    # Optional: path to service account JSON. If unset, uses ADC (gcloud auth application-default login).
    google_application_credentials: str = ""
    # Vertex Live API model (must start with gemini-live- when gemini_use_vertex=true)
    gemini_realtime_model: str = "gemini-live-2.5-flash-native-audio"
    # Lightweight model for Vertex startup health check (not used for voice calls)
    gemini_vertex_healthcheck_model: str = "gemini-2.5-flash"
    gemini_voice: str = "Aoede"
    # Legacy AI Studio key (only if gemini_use_vertex=false)
    gemini_api_key: str = ""
    # Voice worker: "gemini" = native-audio Live API; "legacy" = Groq STT/LLM + ElevenLabs TTS
    voice_pipeline: str = "gemini"
    groq_api_key: str = ""
    # Groq: Llama 3.1 8B Instant (128k) for supervisor live monitoring
    groq_monitoring_model: str = "llama-3.1-8b-instant"
    # Groq: chat agent + sentiment analysis
    groq_chat_model: str = "llama-3.3-70b-versatile"

    # ElevenLabs TTS
    elevenlabs_api_key: str = ""
    # Sarah — works on free-tier API; 21m00Tcm4TlvDq8ikWAM (Rachel) needs a paid plan
    elevenlabs_voice_id: str = "EXAVITQu4vr4xnSDxMaL"
    elevenlabs_model: str = "eleven_flash_v2_5"  # ~75ms latency, realtime

    # Telegram Bot Configuration
    telegram_bot_token: str = ""  # Optional default; per-agent token in DB is preferred
    webhook_domain: str = ""  # Public base URL, e.g. https://abc.ngrok-free.app
    # Alternative to webhook_domain; may include /v1, e.g. https://host/v1
    telegram_webhook_base_url: str = ""

    def resolved_telegram_webhook_v1_base(self) -> str:
        """Base URL for POST /v1/telegram/{agent_id} (must be public HTTPS for Telegram)."""
        raw = (
            (self.telegram_webhook_base_url or "").strip()
            or (self.webhook_domain or "").strip()
        ).rstrip("/")
        if not raw:
            return ""
        if raw.endswith("/v1"):
            return raw
        if raw.endswith("/api/v1"):
            return raw
        if raw.endswith("/api"):
            return f"{raw}/v1"
        return f"{raw}/v1"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins string into list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]

    @property
    def livekit_api_url(self) -> str:
        """HTTPS base URL for LiveKit Server API (RoomService, SendData, etc.)."""
        url = (self.livekit_url or "").strip().rstrip("/")
        if url.startswith("wss://"):
            return "https://" + url[len("wss://") :]
        if url.startswith("ws://"):
            return "http://" + url[len("ws://") :]
        if url.startswith("http://") or url.startswith("https://"):
            return url
        return f"https://{url}"

    @property
    def livekit_ws_url(self) -> str:
        """WebSocket URL for browser clients (always wss:// or ws://)."""
        url = (self.livekit_url or "").strip().rstrip("/")
        if url.startswith("https://"):
            return "wss://" + url[len("https://") :]
        if url.startswith("http://"):
            return "ws://" + url[len("http://") :]
        if url.startswith("wss://") or url.startswith("ws://"):
            return url
        return f"wss://{url}"


# Singleton instance
settings = Settings()

