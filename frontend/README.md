# OmniServa Frontend

React + TypeScript admin and supervisor dashboard for the Customer Service AI Agents platform.

## Setup

```sh
cd frontend
npm install
cp .env.example .env
# Set VITE_API_BASE_URL and Supabase keys in .env
npm run dev
```

## Deploy to Vercel

1. Import the repo in [Vercel](https://vercel.com/new).
2. Set **Root Directory** to `frontend`.
3. Framework preset: **Vite** (build: `npm run build`, output: `dist`).
4. Add **Environment Variables** (Production + Preview):

| Name | Value |
|------|-------|
| `VITE_API_BASE_URL` | `https://omni-backend.mohamed-rabiee.tech/v1` |
| `VITE_SUPABASE_URL` | your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |

5. Deploy. After the first deploy, add your Vercel URL to **Supabase → Authentication → URL Configuration → Redirect URLs** (e.g. `https://your-app.vercel.app/**`).

Local values can be synced from `backend/.env`:

```sh
python backend/scripts/sync_frontend_env.py
```


- `npm run dev` — start Vite dev server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run lint` — run ESLint
- `npm test` — run Vitest

## Stack

- Vite
- React 18
- TypeScript
- Tailwind CSS
- MUI + Radix UI components
