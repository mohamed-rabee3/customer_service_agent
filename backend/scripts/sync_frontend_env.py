"""Sync frontend/.env Supabase keys from backend/.env."""

from pathlib import Path

from dotenv import dotenv_values


def main() -> None:
    root = Path(__file__).resolve().parents[2]
    backend_env = dotenv_values(root / "backend" / ".env")
    frontend_env_path = root / "frontend" / ".env"

    required = ("SUPABASE_URL", "SUPABASE_KEY")
    missing = [key for key in required if not backend_env.get(key)]
    if missing:
        raise SystemExit(f"Missing in backend/.env: {', '.join(missing)}")

    webhook_domain = (backend_env.get("WEBHOOK_DOMAIN") or "").strip().rstrip("/")
    api_base = f"{webhook_domain}/v1" if webhook_domain else "http://localhost:8000/v1"
    supabase_url = (backend_env.get("SUPABASE_URL") or "").strip().rstrip("/")

    lines = [
        f"VITE_SUPABASE_URL={supabase_url}",
        f"VITE_SUPABASE_ANON_KEY={backend_env['SUPABASE_KEY']}",
        f"VITE_API_BASE_URL={api_base}",
        "",
    ]
    frontend_env_path.write_text("\n".join(lines), encoding="utf-8")
    print("Wrote frontend/.env")


if __name__ == "__main__":
    main()
