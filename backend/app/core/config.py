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

    # AI Services
    gemini_api_key: str = ""
    groq_api_key: str = ""
    # Groq: Llama 3.1 8B Instant (128k) for supervisor live monitoring
    groq_monitoring_model: str = "llama-3.1-8b-instant"

    # ElevenLabs TTS
    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = "21m00Tcm4TlvDq8ikWAM"  # Rachel — female
    elevenlabs_model: str = "eleven_flash_v2_5"  # ~75ms latency, realtime

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins string into list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]


# Singleton instance
settings = Settings()

