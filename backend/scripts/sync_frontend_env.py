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

    lines = [
        f"VITE_SUPABASE_URL={backend_env['SUPABASE_URL']}",
        f"VITE_SUPABASE_ANON_KEY={backend_env['SUPABASE_KEY']}",
        "VITE_API_BASE_URL=http://localhost:8000/v1",
        "",
    ]
    frontend_env_path.write_text("\n".join(lines), encoding="utf-8")
    print("Wrote frontend/.env")


if __name__ == "__main__":
    main()
