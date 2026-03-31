## Coaching / School Financial Management System

Modern replacement for an Excel-based financial tracking sheet.

- Next.js (App Router) + Tailwind UI
- Supabase (Postgres + Auth + RLS)
- Google login (Supabase Auth)
- Daily fee collections + expenses CRUD
- Monthly summaries + head-wise reporting
- Automatic email notifications on every new collection/expense entry
- Optional daily report email via Vercel Cron

---

### 1) Supabase setup

1. Create a Supabase project.
2. In Supabase SQL Editor, run:
   - `SUPABASE_SCHEMA.sql`
3. Configure Google OAuth:
   - Supabase Dashboard -> Authentication -> Providers -> Google
   - Add an authorized redirect URL for your environment:
     - Local dev: `http://localhost:3000/login`
     - Vercel: `https://school-income-expense.vercel.app/login`

> Note: The schema uses an `heads.type` enum (`income` / `expense`) and enables Row Level Security (RLS) on all tables.

---

### 2) Email setup (Resend)

1. Create a Resend account.
2. Set these environment variables (see next section).

When you create a new `collection` or `expense`, the server sends an email with the entry details and the updated monthly summary.

---

### 3) Environment variables

Copy `./.env.example` -> `./.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM` (format like `Name <email@domain.com>`)
- `NEXT_PUBLIC_SITE_URL` (local: `http://localhost:3000`, prod: your Vercel domain)
- `REPORT_EMAIL_TO` (single email or comma-separated list)
- `CRON_SECRET` (strong random value for securing daily report endpoint)

---

### 4) Local development

```bash
npm run dev
```

Open: `http://localhost:3000`

---

### 5) Production deployment (Vercel)

1. Push this project to GitHub.
2. Import into Vercel.
3. In Vercel -> Project Settings -> Environment Variables, set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `NEXT_PUBLIC_SITE_URL`
   - `REPORT_EMAIL_TO`
   - `CRON_SECRET`
4. Ensure Google authorized redirect URL matches your deployed domain:
   - `https://<your-domain>/login`

Then deploy.

---

### 6) Daily report email setup

Daily report endpoint:
- `GET /api/reports/daily`

Security:
- Requires `Authorization: Bearer <CRON_SECRET>`

Cron schedule:
- Configured in `vercel.json`
- Current schedule: `0 18 * * *` (daily at 18:00 UTC)

Report receiver:
- Comes from `REPORT_EMAIL_TO`
- Supports multiple emails separated by commas

---

### App structure (key paths)

- Dashboard: `src/app/dashboard/*` (single-page tabbed UI)
- Auth: `src/app/login/page.tsx`
- API routes:
  - `src/app/api/heads/*`
  - `src/app/api/collections/*`
  - `src/app/api/expenses/*`
  - `src/app/api/records/route.ts`
  - `src/app/api/summary/route.ts`
- Supabase schema:
  - `SUPABASE_SCHEMA.sql`

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
