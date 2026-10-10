# BTech Buddy

A production-ready web app for engineering students to **find, preview, and download previous-year question papers** — with a watermarked-PDF pipeline, an admin panel, and a Supabase-backed online database.

![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite%20%2B%20TypeScript-3b82f6) ![Backend](https://img.shields.io/badge/backend-FastAPI%20%2B%20PyMuPDF-2563eb) ![DB](https://img.shields.io/badge/database-Supabase%20PostgreSQL-3ecf8e)

---

## Features

**Student site (no login required)**
- Home with live stats, recent uploads, institution browser
- Browse papers with search + filters (institution, branch, semester, exam type, year) and shareable URLs
- Paper details page with related papers and real download counts
- In-browser PDF preview and direct download of **watermarked** PDFs
- Contact form, FAQ, Privacy / Terms / DMCA pages

**Admin panel (Supabase Auth + server-side authorization)**
- Dashboard with real upload/download statistics, 7-day download chart, top papers, recent uploads
- Upload PDFs with progress bar → server validates, watermarks every page with a light diagonal **"BTech Buddy"** stamp via PyMuPDF, stores original + processed copies in **private** Supabase Storage
- Edit metadata, replace PDF (re-watermarked), publish / unpublish / delete
- Manage institutions (universities vs. colleges/institutes with affiliation links, verification flags), branches, and subjects
- Invite / revoke / restore / remove admins; **only the super admin can manage super-admin roles**
- Activity log (audit trail) for every admin action

**Security**
- Supabase RLS: public can only read `published` papers; everything else is service-role only
- Private storage bucket; students only ever receive processed, watermarked files
- Short-lived signed URLs used internally; files streamed through the backend
- JWT verification (RS256 via JWKS, HS256 fallback), rate limiting, input validation, IP hashing, audit logs

---

## Architecture

```
┌─────────────────────────┐        ┌──────────────────────────┐
│  React + Vite + TS SPA  │        │  FastAPI backend         │
│  Tailwind + Framer      │  HTTPS │  - JWT verification      │
│  Supabase Auth (JS)     │───────▶│  - PDF validation        │
│  Public + admin routes  │        │  - PyMuPDF watermarking  │
└─────────────────────────┘        │  - PostgREST + Storage   │
                                   │  - Rate limiting, audit  │
                                   └───────────┬──────────────┘
                                               │ service role
                                   ┌───────────▼──────────────┐
                                   │  Supabase                │
                                   │  PostgreSQL (RLS)        │
                                   │  Storage: pdfs (private) │
                                   │  Auth (email/password)   │
                                   └──────────────────────────┘
```

## Project structure

```
BTech Buddy/
├── frontend/                 # React + Vite + TypeScript + Tailwind v4
│   └── src/
│       ├── pages/            # Home, Browse, PaperDetails, Preview, Contact, FAQ, Policies, Auth
│       ├── pages/admin/      # Dashboard, Papers, Upload, Edit, Institutions, Academic, Admins, Logs
│       ├── components/       # Layout, Navbar, PaperCard, Modal, Skeletons, Toast
│       ├── context/          # Auth (Supabase), Toast
│       └── lib/            # api client, supabase client, types, formatting
├── backend/                  # FastAPI + PyMuPDF
│   ├── app/
│   │   ├── main.py         # app, CORS, error handlers, bootstrap
│   │   ├── config.py       # env-driven settings
│   │   ├── database.py     # Supabase REST/Storage/Auth via service key
│   │   ├── auth.py         # JWT verify (RS256/HS256) + role checks
│   │   ├── watermark.py    # diagonal repeating watermark (PyMuPDF)
│   │   ├── pdf_utils.py    # upload validation
│   │   ├── audit.py        # activity logging
│   │   └── routers/        # papers, admin_papers, institutions, admins, stats, contact, setup, public_stats
│   ├── tests/              # pytest: watermark, PDF validation, API
│   └── Dockerfile
└── supabase/
    └── migrations/         # 0001 schema · 0002 RLS · 0003 seed · 0004 download RPC
```

## Setup instructions

### 1. Prerequisites
- Node.js 20+ and npm
- Python 3.11+
- A [Supabase](https://supabase.com) project (free tier works)

### 2. Database
Apply the migrations (Supabase CLI or Dashboard → SQL Editor, in order):
```bash
supabase db reset
# or run supabase/migrations/0001_schema.sql, 0002_rls.sql,
# 0003_seed.sql, 0004_downloads.sql, 0005_exam_types.sql in the SQL Editor
```
This creates all tables, RLS policies, the private `pdfs` storage bucket, and seeds the verified Kanpur institutions (CSJMU, HBTU, Rama University, CSA University, IIT Kanpur, AKTU) plus affiliated colleges/institutes (PSIT, AITH, UPTTI, National Sugar Institute), branches, and subjects.

### 3. Environment variables
Copy `.env.example` → `.env` at the repo root and fill in:

```bash
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # backend only
SUPABASE_JWT_SECRET=<jwt secret>             # only for older HS256 projects

# Initial super admin — created once on backend startup.
# Use the email you want (e.g. admin@yoursite.com)
# and a strong password you choose. Never commit these.
INITIAL_SUPER_ADMIN_EMAIL=
INITIAL_SUPER_ADMIN_PASSWORD=

# OR enable the one-time /setup flow with a token:
SETUP_TOKEN=<random-token>

CORS_ORIGINS=http://localhost:5173
```

> **Credentials are never hardcoded.** The initial super-admin password is read from the environment only. The password shown in your onboarding chat is yours to set in `.env` — do not paste it into source code, GitHub, or docs.

### 4. Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload          # http://localhost:8000
```

### 5. Frontend
```bash
cd frontend
cp .env.example .env                   # set VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm install
npm run dev                            # http://localhost:5173
```

### 6. Sign in
Open http://localhost:5173/login and sign in with the super-admin credentials you configured. If you used `SETUP_TOKEN` instead, visit `/setup` once to create the account.

### 7. Docker (optional)
```bash
docker compose up --build              # backend on :8000
```
Deploy the frontend to Vercel/Netlify (see `frontend/vercel.json` for SPA rewrites) with the `VITE_*` env vars set.

## Testing

Backend (pytest):
```bash
cd backend
python -m pytest tests/ -v
```
Covers: watermark presence on every page, watermark rejects encrypted/empty input, PDF validation (size/type/encryption), health endpoint, setup-token and password-strength rules, and upload rejection without auth.

Manual test checklist (run against your Supabase project):
1. `GET /api/health` → `{"status":"ok"}`
2. Sign in at `/login` → redirected to `/admin`
3. Upload a PDF at **Admin → Upload Paper** → verify progress bar, success toast, and that the downloaded file contains the diagonal "BTech Buddy" watermark on every page
4. Publish → open `/browse` → search, filter, preview, download
5. Edit / unpublish / delete a paper; verify counts update
6. **Admins → Invite admin** → new admin can sign in; revoke → sign-in to admin panel is denied
7. Super admin changes another admin's role; a regular admin cannot
8. Mobile: browse, filter drawer, upload form, admin sidebar
9. Refresh / redeploy → all data persists (it lives in Supabase, not the browser)

## API overview

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/papers` | Public (published only) |
| GET | `/api/papers/filters` | Public |
| GET | `/api/papers/{id}` | Public (published) |
| GET | `/api/papers/{id}/preview` | Public (published) — streams watermarked PDF |
| GET | `/api/papers/{id}/download` | Public (published) — records stats, streams watermarked PDF |
| GET | `/api/stats/summary` | Public summary counters |
| POST | `/api/contact` | Public, rate-limited |
| GET | `/api/setup-status` | Public |
| POST | `/api/setup` | One-time, token-gated |
| GET/POST | `/api/admin/papers` | Admin |
| PATCH/DELETE | `/api/admin/papers/{id}` | Admin |
| POST | `/api/admin/papers/{id}/publish` · `/unpublish` · `/replace` | Admin |
| GET/POST/PATCH/DELETE | `/api/admin/institutions|branches|subjects` | Admin |
| GET | `/api/admin/admins` · POST `/invite` | Admin |
| PATCH/POST/DELETE | `/api/admin/admins/{user_id}` | Role-gated (super admin for super_admin targets) |
| GET | `/api/admin/stats` · `/api/admin/activity-logs` · `/api/admin/contact-messages` | Admin |

## Notes & external setup still required
- **Supabase project** must be created by you (steps above). The app cannot provision it automatically.
- **Supabase Auth**: enable Email/Password provider. Newer projects use RS256 (auto-detected via JWKS); older HS256 projects need `SUPABASE_JWT_SECRET`.
- **Rate limiting** uses in-memory storage (slowapi). For multi-instance deployments, point slowapi at Redis.
- Email sending (e.g. invite emails) is not configured by design; temporary passwords are returned once to the inviting admin to relay securely.
- Watermark appearance is configurable via `WATERMARK_TEXT`, `WATERMARK_OPACITY`, `WATERMARK_ANGLE` env vars.

## License
Proprietary — for educational use by BTech Buddy admins and students.
