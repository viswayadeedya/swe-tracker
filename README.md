# AI Career Sprint OS

A personal operating system for a 30-day AI engineer job sprint. Track time, log notes, review daily progress, and stay accountable — all in one focused app.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Turso](https://img.shields.io/badge/Database-Turso-4ff8d2?logo=sqlite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)

---

## What is this?

This app is built for a software engineer following a structured 30-day upskilling plan to break into AI engineering roles. It replaces scattered notes, spreadsheets, and todo apps with a single focused workspace.

**The problem it solves:**
- You have a 30-day plan but no system to actually execute it
- You lose track of how much time you spend on each area (building vs. interview prep vs. networking)
- You forget what you struggled with, so you repeat the same mistakes
- There's no feedback loop — no daily reflection, no pattern recognition

**What this app gives you:**
- A pre-loaded 30-day roadmap with 120+ tasks mapped to your plan
- A one-click timer per task so tracking time takes zero friction
- Daily reviews with AI-generated coaching summaries (via Gemini)
- Notes organized by type: wins, struggles, ideas, work logs
- Analytics to see where your time actually goes
- PIN-protected so it's private when deployed

---

## Features

### Dashboard
- Today's date + current sprint day (Day X of 30)
- Summary cards: time logged today, tasks completed, streak, focus score
- Category breakdown: Build / Interview Prep / Profile & Marketing / Applications
- Recent activity feed

### Today's Focus
- Day objective + task checklist
- One-click timer per task — only one runs at a time
- Stop timer → quick reflection: what you worked on, completed, got stuck on
- Add custom tasks beyond the pre-loaded ones

### 30-Day Roadmap
- Full sprint plan grouped by week
- Expand any day to see tasks + check them off
- Progress indicator per day

### Sessions History
- All timer sessions grouped by date
- Shows task, category, duration, and your reflection notes

### Notes
- Quick capture: work / struggle / idea / win
- Tag notes with tech keywords (FastAPI, RAG, DSA, LinkedIn, etc.)
- Filter by type or tag, search by content

### Daily Review
- End-of-day form: wins, struggles, blockers, lessons, tomorrow's plan
- Focus score (1–10) and energy score (1–10)
- **AI Coach** button → Gemini reads your sessions + notes and generates:
  - A summary of what you accomplished
  - Top 3 priorities for tomorrow
  - An encouraging observation
- View and expand all past reviews

### Analytics
- Daily hours bar chart (last 14 days)
- Hours by category (pie chart)
- Tasks completed by week (bar chart)
- Total hours, total sessions, average session length

### Settings
- Set sprint start date (auto-calculates current day)
- Gemini API key
- Change PIN
- Export all data to Markdown

### PIN Lock
- PIN-protected login screen on every visit
- First visit creates your PIN (4–6 digits)
- Sessions last 30 days
- Lock app from sidebar anytime

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Database | Turso (hosted SQLite via libSQL) |
| AI | Google Gemini 1.5 Flash |
| Auth | PIN + httpOnly session cookie |
| Hosting | Vercel |

---

## Architecture

```
Browser (Next.js App Router)
│
├── app/login/page.tsx          ← PIN screen
├── app/page.tsx                ← Main SPA shell
├── components/
│   ├── Sidebar.tsx             ← Navigation + sprint progress
│   ├── TimerHUD.tsx            ← Live timer banner + reflection form
│   ├── DashboardView.tsx
│   ├── TodayView.tsx
│   ├── RoadmapView.tsx
│   ├── SessionsView.tsx
│   ├── NotesView.tsx
│   ├── ReviewView.tsx
│   ├── AnalyticsView.tsx
│   └── SettingsView.tsx
│
├── app/api/                    ← Next.js API routes (serverless)
│   ├── auth/verify             ← PIN verify → set session cookie
│   ├── auth/logout             ← Clear cookie
│   ├── dashboard               ← Stats for today
│   ├── plan-days               ← 30-day roadmap
│   ├── tasks                   ← CRUD tasks
│   ├── sessions                ← Timer sessions
│   ├── notes                   ← Quick notes + tags
│   ├── reviews                 ← Daily reviews
│   ├── analytics               ← Aggregate queries
│   ├── settings                ← Key-value settings
│   ├── ai/summary              ← Gemini coaching summary
│   └── export/markdown         ← Full data export
│
├── lib/db.ts                   ← Turso client + schema init + 30-day seed
├── middleware.ts               ← PIN auth guard on all routes
└── types/index.ts              ← Shared TypeScript types
```

**Data flow for a timer session:**
1. User clicks "Start" on a task → `POST /api/sessions` → row created in Turso
2. Frontend ticks elapsed time locally (no server polling)
3. User clicks "Stop" → reflection modal → `PATCH /api/sessions/:id` → duration saved
4. Dashboard and analytics queries re-run automatically

---

## Database Schema

```sql
plan_days     -- 30 rows, one per sprint day (seeded on first run)
tasks         -- ~120 rows pre-seeded + any custom tasks you add
sessions      -- one row per timer start/stop
quick_notes   -- notes you capture throughout the day
daily_reviews -- one row per day you complete a review
tags          -- FastAPI, Python, Gemini, RAG, DSA, etc.
note_tags     -- many-to-many: notes ↔ tags
settings      -- key/value: sprint_start_date, gemini_api_key, pin_hash
```

---

## Running Locally

**Prerequisites:** Node.js 20+, a free [Turso](https://turso.tech) account

**1. Clone the repo**
```bash
git clone https://github.com/YOUR_USERNAME/ai-career-sprint-os.git
cd ai-career-sprint-os
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables**

Create `.env.local`:
```env
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
GEMINI_API_KEY=your-gemini-api-key
AUTH_SECRET=any-random-string-you-choose
```

Get your Turso credentials from [app.turso.tech](https://app.turso.tech).  
Get your Gemini API key from [aistudio.google.com](https://aistudio.google.com/app/apikey).

**4. Start the dev server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

On first load the app creates all tables and seeds the 30-day roadmap automatically. You'll be prompted to create a PIN.

---

## Deploying to Vercel

**1. Push to GitHub**
```bash
git add .
git commit -m "init"
git remote add origin https://github.com/YOUR_USERNAME/ai-career-sprint-os.git
git push -u origin main
```

**2. Import to Vercel**

Go to [vercel.com](https://vercel.com) → Add New Project → Import your repo.

**3. Add environment variables**

In Vercel dashboard → Settings → Environment Variables:

| Name | Value |
|---|---|
| `TURSO_DATABASE_URL` | `libsql://your-db.turso.io` |
| `TURSO_AUTH_TOKEN` | your token |
| `GEMINI_API_KEY` | your Gemini key |
| `AUTH_SECRET` | same value as your `.env.local` |

**4. Deploy**

Click Deploy. Your app will be live at `your-project.vercel.app` in ~2 minutes.

> Local dev and Vercel share the same Turso database, so all your data is always in sync.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TURSO_DATABASE_URL` | Yes | Turso DB URL (`libsql://...`) or local file (`file:data/sprint.db`) |
| `TURSO_AUTH_TOKEN` | Prod only | Turso auth token (not needed for local file) |
| `AUTH_SECRET` | Yes | Random string used to sign session cookies |
| `GEMINI_API_KEY` | Optional | Enables AI coaching summaries in Daily Review |

---

## The 30-Day Plan

The pre-loaded roadmap follows a structured 4-week sprint:

| Week | Focus | Days |
|---|---|---|
| Week 1 | Ship v0.1 — FastAPI + Next.js + Gemini basics | 1–7 |
| Week 2 | RAG foundations + cloud deployment | 8–14 |
| Week 3 | Real RAG pipeline + workflow depth | 15–21 |
| Week 4 | Senior polish — evals, auth, LinkedIn, interview prep | 22–30 |

Each day has 3–5 tasks with estimated times, priorities, and detailed descriptions. You can check them off, add your own custom tasks, and track time against any of them.

---

## Design Decisions

**Why Turso instead of Postgres/Supabase?**  
This is a personal single-user app. Turso is hosted SQLite — zero config, free tier is generous (9GB, unlimited reads), and the SQL is identical to what we'd use locally. No connection pooling, no schema migrations, no billing surprises.

**Why Next.js API routes instead of a separate backend?**  
One repo, one deploy, one set of environment variables. For a personal tool this is the right tradeoff. If this were multi-user, a separate FastAPI service would make more sense for the AI/vector workloads.

**Why PIN instead of OAuth?**  
It's a personal productivity app. OAuth (Google/GitHub login) would be overkill and add dependencies. A PIN stored as a SHA-256 hash in the DB + an httpOnly session cookie is enough to keep the app private when deployed.

**Why client-side timer instead of server polling?**  
The timer ticks via `setInterval` in the browser. The session start time is saved to Turso on "Start" and the duration is computed on "Stop". This means zero server load during timing and accurate durations even if the network blips.

---

## What I'd Build Next

- **Multi-device sync indicator** — show last-synced time since Turso is shared
- **Weekly AI report** — Gemini summarises the whole week, not just one day
- **Job application tracker** — log companies, roles, status alongside the sprint
- **Streak recovery** — if you miss a day, log a retroactive session
- **Mobile PWA** — installable on phone for quick note capture between sessions
- **Export to PDF** — formatted sprint report for sharing with mentors

---

## License

MIT
