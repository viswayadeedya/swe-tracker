import { createClient, type Client, type InValue } from '@libsql/client';

// In dev: uses local file  (TURSO_DATABASE_URL=file:./data/sprint.db)
// In prod: uses Turso cloud (TURSO_DATABASE_URL=libsql://...  TURSO_AUTH_TOKEN=...)

let _client: Client | undefined;
let _initPromise: Promise<void> | undefined;

function client(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL ?? 'file:data/sprint.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;
    _client = createClient({ url, authToken });
  }
  return _client;
}

export async function ensureInit(): Promise<void> {
  if (!_initPromise) _initPromise = initSchema();
  await _initPromise;
}

function toArgs(args: unknown[]): InValue[] {
  return args as InValue[];
}

// Query multiple rows
export async function q<T = Record<string, unknown>>(sql: string, args: unknown[] = []): Promise<T[]> {
  await ensureInit();
  const r = await client().execute({ sql, args: toArgs(args) });
  return r.rows as unknown as T[];
}

// Query single row
export async function q1<T = Record<string, unknown>>(sql: string, args: unknown[] = []): Promise<T | undefined> {
  const rows = await q<T>(sql, args);
  return rows[0];
}

// Insert / update / delete — returns last inserted id
export async function run(sql: string, args: unknown[] = []): Promise<number> {
  await ensureInit();
  const r = await client().execute({ sql, args: toArgs(args) });
  return Number(r.lastInsertRowid);
}

async function initSchema(): Promise<void> {
  const c = client();

  const schema = [
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS plan_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_number INTEGER UNIQUE NOT NULL,
      title TEXT NOT NULL,
      objective TEXT NOT NULL,
      week INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_day_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT NOT NULL,
      estimated_minutes INTEGER DEFAULT 60,
      priority TEXT DEFAULT 'Medium',
      status TEXT DEFAULT 'todo',
      is_custom INTEGER DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_minutes REAL DEFAULT 0,
      note TEXT DEFAULT '',
      worked_on TEXT DEFAULT '',
      completed_work TEXT DEFAULT '',
      stuck_on TEXT DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS quick_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'work',
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS daily_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_day_id INTEGER,
      date TEXT NOT NULL UNIQUE,
      wins TEXT DEFAULT '',
      struggles TEXT DEFAULT '',
      blockers TEXT DEFAULT '',
      lessons TEXT DEFAULT '',
      plan_tomorrow TEXT DEFAULT '',
      focus_score INTEGER DEFAULT 5,
      energy_score INTEGER DEFAULT 5,
      ai_summary TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS note_tags (
      note_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (note_id, tag_id)
    )`,
  ];

  for (const stmt of schema) {
    await c.execute(stmt);
  }

  // Seed only if empty
  const { rows } = await c.execute('SELECT COUNT(*) as c FROM plan_days');
  if (Number(rows[0]?.c ?? 0) === 0) {
    await seedData(c);
  }

  // Default settings
  await c.execute({ sql: "INSERT OR IGNORE INTO settings (key, value) VALUES ('sprint_start_date', ?)", args: [new Date().toISOString().split('T')[0]] });
  await c.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('gemini_api_key', '')");

  // Default tags
  const tags = ['FastAPI', 'Python', 'Gemini', 'RAG', 'Deployment', 'DSA', 'Resume', 'LinkedIn', 'NextJS', 'TypeScript', 'Docker', 'Postgres'];
  for (const name of tags) {
    await c.execute({ sql: 'INSERT OR IGNORE INTO tags (name) VALUES (?)', args: [name] });
  }
}

type SeedTask = { title: string; description: string; category: string; estimated_minutes: number; priority: string };
type SeedDay  = { day: number; week: number; title: string; objective: string; tasks: SeedTask[] };

async function seedData(c: Client) {
  const roadmap: SeedDay[] = [
    {
      day: 1, week: 1, title: "Stack + Scaffolding",
      objective: "Decide stack, create GitHub repo, init Next.js app, setup FastAPI backend with GET /health",
      tasks: [
        { title: "Write stack decisions in README", description: "Document chosen stack: Next.js + TS frontend, Python + FastAPI backend, Gemini API, Postgres (later), Vercel + Render/Railway deployment", category: "Build", estimated_minutes: 30, priority: "High" },
        { title: "Create GitHub repository", description: "Create public GitHub repo with .gitignore for Python + Node, initial commit, branch strategy", category: "Build", estimated_minutes: 15, priority: "High" },
        { title: "Initialize Next.js app", description: "npx create-next-app@latest with TypeScript + Tailwind. Add one page with two textareas (resume + JD) and a submit button", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Setup FastAPI /backend", description: "Create /backend directory, main.py with GET /health endpoint, requirements.txt, run uvicorn main:app --reload", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Watch FastAPI Crash Course (30-40 min)", description: "Study routes, path params, request/response models. Take notes on Pydantic models", category: "Build", estimated_minutes: 45, priority: "Medium" },
      ]
    },
    {
      day: 2, week: 1, title: "Connect Frontend ↔ FastAPI",
      objective: "Implement POST /tailor stub in FastAPI, call it from Next.js, add loading + error states",
      tasks: [
        { title: "Implement POST /tailor (stub)", description: "Request body: resume_text + job_description. Return hardcoded bullets + cover letter JSON. Add Pydantic request/response models", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Call /tailor from Next.js via fetch", description: "Write async fetch call in React component. Display returned JSON in the UI. Handle the response structure", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Add loading state and error message", description: "Show spinner while fetching. Display user-friendly error on failure. Disable submit while loading", category: "Build", estimated_minutes: 30, priority: "Medium" },
        { title: "Read FastAPI docs: Request Body + Response Model", description: "Study Pydantic BaseModel usage, response_model parameter, HTTP status codes", category: "Build", estimated_minutes: 30, priority: "Medium" },
      ]
    },
    {
      day: 3, week: 1, title: "Plug in Gemini",
      objective: "Get Gemini API key, integrate Python quickstart, replace stub with real Gemini call",
      tasks: [
        { title: "Get Gemini API key", description: "Go to Google AI for Developers (aistudio.google.com). Create API key. Add to .env file. Never commit to git", category: "Build", estimated_minutes: 15, priority: "High" },
        { title: "Follow Gemini Python quickstart", description: "pip install google-generativeai. Run the quickstart script until you get a response from a model. Test with a simple prompt", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Replace stub with Gemini call", description: "Prompt: 'Given this resume and JD, output improved bullets and a cover letter in JSON.' Parse response and return structured JSON", category: "Build", estimated_minutes: 90, priority: "High" },
        { title: "Handle Gemini errors gracefully", description: "Handle: invalid API key, rate limiting, JSON parse failures, empty responses. Return appropriate HTTP error codes", category: "Build", estimated_minutes: 45, priority: "Medium" },
      ]
    },
    {
      day: 4, week: 1, title: "Better UX + Prompt Quality",
      objective: "Refine Gemini prompt for better output, improve UI with Tailwind split layout",
      tasks: [
        { title: "Refine Gemini prompt", description: "Specify: 4-6 tailored bullets max, 200 word cover letter, professional tone, JSON structure with bullets[] and cover_letter fields", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Split UI into Inputs and Outputs sections", description: "Left column: resume + JD textareas. Right column: generated bullets + cover letter. Clean layout", category: "Build", estimated_minutes: 60, priority: "Medium" },
        { title: "Add Tailwind styling", description: "Style cards, textareas, buttons, output display. Clean, professional look. Add copy-to-clipboard for outputs", category: "Build", estimated_minutes: 60, priority: "Medium" },
        { title: "Test prompt with 3 different resumes + JDs", description: "Evaluate output quality. Note what works and what doesn't. Iterate on prompt wording", category: "Build", estimated_minutes: 45, priority: "Medium" },
      ]
    },
    {
      day: 5, week: 1, title: "Structure Backend Like a Pro",
      objective: "Refactor FastAPI into schemas.py, routes.py, config.py with proper type hints and error handling",
      tasks: [
        { title: "Create schemas.py with Pydantic models", description: "TailorRequest, TailorResponse, JobCreate, JobResponse models. Add field validators and docstrings", category: "Build", estimated_minutes: 45, priority: "High" },
        { title: "Create routes/tailor.py with APIRouter", description: "Move /tailor endpoint to its own router. Use prefix and tags. Import router in main.py", category: "Build", estimated_minutes: 45, priority: "High" },
        { title: "Create config.py for env vars", description: "Use pydantic-settings BaseSettings. Load GEMINI_API_KEY and other env vars. Singleton settings instance", category: "Build", estimated_minutes: 30, priority: "High" },
        { title: "Add proper HTTP status codes + error responses", description: "Use HTTPException with status codes: 400 for bad input, 422 for validation, 500 for server errors. Consistent error response shape", category: "Build", estimated_minutes: 45, priority: "Medium" },
        { title: "Add type hints everywhere", description: "All function parameters and return types. Use Optional, List, Dict appropriately. Run mypy if possible", category: "Build", estimated_minutes: 30, priority: "Low" },
      ]
    },
    {
      day: 6, week: 1, title: "Data Layer v0: Save Job Postings",
      objective: "Add SQLite persistence for job postings, POST/GET /jobs endpoints, jobs sidebar in UI",
      tasks: [
        { title: "Setup SQLite with SQLModel", description: "pip install sqlmodel. Create database.py with SQLite engine. Create Job model with: id, title, company, jd_text, created_at", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Implement POST /jobs endpoint", description: "Save job description with title + company. Return created job with ID. Add to jobs router", category: "Build", estimated_minutes: 45, priority: "High" },
        { title: "Implement GET /jobs endpoint", description: "Return list of all saved jobs. Include id, title, company, created_at. Order by newest first", category: "Build", estimated_minutes: 30, priority: "High" },
        { title: "Add jobs sidebar to Next.js UI", description: "Left sidebar showing saved jobs list. Click to populate JD textarea. Add 'Save Job' button on main form", category: "Build", estimated_minutes: 60, priority: "Medium" },
      ]
    },
    {
      day: 7, week: 1, title: "Testing, Cleanup + README v1",
      objective: "Manual test with real resumes/JDs, add basic tests, write complete README",
      tasks: [
        { title: "Manual test with 3+ resumes and JDs", description: "Test edge cases: very long resume, missing sections, different JD formats. Document what breaks", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Add integration test for /tailor", description: "Write pytest test that calls /tailor with sample data. Assert response shape. Add to CI later", category: "Build", estimated_minutes: 90, priority: "Medium" },
        { title: "Write README v1", description: "Sections: Problem, Solution, Tech Stack, Features, How to Run Locally. Add setup instructions for both frontend and backend", category: "Profile/Marketing", estimated_minutes: 60, priority: "Medium" },
        { title: "Code cleanup pass", description: "Remove debug prints. Consistent naming. Extract magic strings to constants. Add .env.example", category: "Build", estimated_minutes: 45, priority: "Low" },
      ]
    },
    {
      day: 8, week: 2, title: "Learn RAG Conceptually",
      objective: "Deeply understand RAG: embeddings, vector DB, retrieval, LLM augmentation — before implementing",
      tasks: [
        { title: "Read RAG API tutorial in full", description: "Read 'Python RAG API with FastAPI + LangChain + pgvector' or equivalent. Take notes on architecture", category: "Build", estimated_minutes: 90, priority: "High" },
        { title: "Study embeddings fundamentals", description: "Understand: what an embedding is, why cosine similarity works, embedding dimensions, model choices (text-embedding-004)", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Study vector database options", description: "Compare: Chroma (local/simple), pgvector (Postgres), Pinecone (cloud). Note when to use each", category: "Build", estimated_minutes: 45, priority: "Medium" },
        { title: "Draw RAG architecture diagram", description: "Sketch the flow: document → chunk → embed → store → query → retrieve → LLM → response. Keep it simple", category: "Build", estimated_minutes: 30, priority: "Medium" },
      ]
    },
    {
      day: 9, week: 2, title: "RAG-Flavored /compare Endpoint",
      objective: "Build POST /compare that identifies skill gaps and suggests resume changes using Gemini",
      tasks: [
        { title: "Implement POST /compare endpoint", description: "Input: resume_text + job_ids[]. Fetch saved JDs from DB. Pass all to Gemini. Return structured analysis", category: "Build", estimated_minutes: 90, priority: "High" },
        { title: "Design comparison prompt", description: "Ask Gemini: list missing skills, suggest 3-5 specific resume changes, rate match 1-10. Output JSON with missing_skills[], suggested_changes[], match_score", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Add comparison UI to frontend", description: "Button: 'Analyze Fit'. Show missing skills as chips. Show suggested changes as list. Show match score prominently", category: "Build", estimated_minutes: 60, priority: "Medium" },
      ]
    },
    {
      day: 10, week: 2, title: "Prepare for Real RAG",
      objective: "Enhance job data model, add cleaned text field, improve job detail endpoint",
      tasks: [
        { title: "Add cleaned_text column to jobs", description: "Alembic migration or recreate table. Add: cleaned_text (normalized JD), embedding_status (pending/done), notes field", category: "Build", estimated_minutes: 45, priority: "High" },
        { title: "Implement GET /jobs/:id endpoint", description: "Return full job detail including JD text. Add to jobs router. Test with Postman/curl", category: "Build", estimated_minutes: 30, priority: "High" },
        { title: "Add JD text preprocessing", description: "Strip HTML, normalize whitespace, remove boilerplate phrases. Store cleaned version for embedding", category: "Build", estimated_minutes: 45, priority: "Medium" },
        { title: "Add tags field to jobs", description: "Allow labeling jobs as: frontend, backend, fullstack, ML, startup, FAANG. Store as comma-separated or JSON array", category: "Build", estimated_minutes: 30, priority: "Low" },
      ]
    },
    {
      day: 11, week: 2, title: "Deploy Backend to Cloud",
      objective: "Dockerize FastAPI, deploy to Render/Railway, fix CORS for frontend",
      tasks: [
        { title: "Write Dockerfile for FastAPI", description: "Multi-stage build. Base: python:3.11-slim. Copy requirements.txt, install deps, copy source, CMD uvicorn. Test locally first", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Deploy to Render or Railway", description: "Create account, connect GitHub repo. Set env vars: GEMINI_API_KEY, DATABASE_URL. Verify health endpoint responds", category: "Build", estimated_minutes: 90, priority: "High" },
        { title: "Fix CORS for Next.js frontend", description: "Add CORSMiddleware to FastAPI. Allow: localhost:3000 for dev, Vercel domain for prod. Test preflight requests", category: "Build", estimated_minutes: 30, priority: "High" },
        { title: "Test all endpoints on deployed URL", description: "Test /health, /tailor, /jobs endpoints. Check response times. Note cold start latency", category: "Build", estimated_minutes: 30, priority: "High" },
      ]
    },
    {
      day: 12, week: 2, title: "Deploy Frontend to Vercel",
      objective: "Connect GitHub to Vercel, configure env vars, test full stack on the internet",
      tasks: [
        { title: "Connect GitHub repo to Vercel", description: "Import project in Vercel dashboard. Set framework preset to Next.js. Configure build settings", category: "Build", estimated_minutes: 30, priority: "High" },
        { title: "Set environment variables in Vercel", description: "Add NEXT_PUBLIC_API_URL pointing to Railway/Render backend URL. Test that env var is available in build", category: "Build", estimated_minutes: 20, priority: "High" },
        { title: "Test end-to-end on production URLs", description: "Test full flow: paste resume + JD → submit → get results. Verify CORS, network requests, response handling", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Fix TypeScript build errors", description: "Address any strict mode errors that pass locally but fail in CI. Add missing types. Fix any env var issues", category: "Build", estimated_minutes: 45, priority: "Medium" },
        { title: "Share deployed URL with someone for feedback", description: "Share on LinkedIn or with a friend. Note their first impressions and usability feedback", category: "Profile/Marketing", estimated_minutes: 30, priority: "Low" },
      ]
    },
    {
      day: 13, week: 2, title: "Logging + Observability",
      objective: "Add structured logging middleware, basic metrics tracking, /metrics endpoint",
      tasks: [
        { title: "Add logging middleware to FastAPI", description: "Log: method, path, status_code, duration_ms, timestamp. Use Python logging module with JSON formatter. No PII in logs", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Track request metrics in-memory", description: "Count: total requests, requests by endpoint, error count. Store in a simple dict. Reset on restart (upgrade to Redis later)", category: "Build", estimated_minutes: 60, priority: "Medium" },
        { title: "Add /metrics endpoint", description: "Return: request counts by endpoint, avg latency, error rate, uptime. Protect with simple API key header", category: "Build", estimated_minutes: 45, priority: "Low" },
        { title: "Review logs for insights", description: "Look at actual usage patterns. Which endpoints are slowest? What errors occur most? Note for improvement", category: "Build", estimated_minutes: 30, priority: "Low" },
      ]
    },
    {
      day: 14, week: 2, title: "Documentation + Refactors",
      objective: "Update README with architecture diagram, 'How it Works' section, and code cleanup",
      tasks: [
        { title: "Add architecture diagram to README", description: "Use draw.io or Mermaid. Show: Next.js → FastAPI → Gemini, SQLite DB, deployment boxes (Vercel, Railway)", category: "Profile/Marketing", estimated_minutes: 60, priority: "Medium" },
        { title: "Write 'How It Works' section", description: "Explain: FastAPI routes, Gemini prompt engineering, job storage, comparison logic. 300-500 words max", category: "Profile/Marketing", estimated_minutes: 45, priority: "Medium" },
        { title: "Rename and split large functions", description: "If any function is >50 lines, split it. Rename any unclear variable names. Remove dead code", category: "Build", estimated_minutes: 45, priority: "Low" },
        { title: "Add API documentation with FastAPI /docs", description: "Add docstrings to all endpoints. Verify /docs and /redoc look complete and accurate", category: "Build", estimated_minutes: 30, priority: "Low" },
      ]
    },
    {
      day: 15, week: 3, title: "Embeddings + Vector Store",
      objective: "Choose vector DB, implement embedding generation, build indexing endpoint",
      tasks: [
        { title: "Choose and install Chroma vector DB", description: "pip install chromadb. Create a local persistent client. Verify with a hello-world insert and query.", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Implement embedding generation", description: "Use Google text-embedding-004 via Gemini API. Wrap in embed_text(text: str) -> list[float] helper", category: "Build", estimated_minutes: 75, priority: "High" },
        { title: "Build POST /jobs/:id/index endpoint", description: "Fetch job from DB, generate embedding, store in Chroma with job_id as document ID.", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Test embedding quality", description: "Manually embed 3-5 jobs. Query with a test string. Verify similarity scores make intuitive sense", category: "Build", estimated_minutes: 30, priority: "Medium" },
      ]
    },
    {
      day: 16, week: 3, title: "Retrieval Endpoint",
      objective: "Build POST /search-jobs that takes a query, embeds it, retrieves top-N matching jobs",
      tasks: [
        { title: "Implement POST /search-jobs", description: "Input: query string + n (default 3). Embed the query. Query Chroma for top-N. Return job IDs + similarity scores + job details", category: "Build", estimated_minutes: 90, priority: "High" },
        { title: "Add search UI to frontend", description: "Search bar above jobs sidebar. Show results ranked by relevance with match scores. Highlight matching terms", category: "Build", estimated_minutes: 75, priority: "Medium" },
        { title: "Index all existing jobs on startup", description: "On FastAPI startup, check for un-indexed jobs and index them in a background task", category: "Build", estimated_minutes: 45, priority: "Medium" },
        { title: "Test retrieval with diverse queries", description: "Query: 'frontend React position', 'ML engineer with Python', 'startup early stage'. Evaluate relevance of results", category: "Build", estimated_minutes: 30, priority: "Medium" },
      ]
    },
    {
      day: 17, week: 3, title: "RAG-Augmented Tailoring",
      objective: "Update /tailor to retrieve similar past jobs and use them as RAG context for better output",
      tasks: [
        { title: "Update /tailor to use RAG context", description: "Before Gemini call: embed the new JD, retrieve top-3 similar stored JDs. Pass retrieved JDs as context in prompt", category: "Build", estimated_minutes: 90, priority: "High" },
        { title: "Update Gemini prompt for RAG", description: "Prompt template: 'Target JD: {jd}\\nSimilar roles for context: {retrieved}\\nResume: {resume}\\nGenerate tailored bullets...'", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Compare RAG vs non-RAG output quality", description: "Run /tailor with same resume+JD both ways. Document: does RAG improve relevance? Better keyword matching?", category: "Build", estimated_minutes: 45, priority: "Medium" },
        { title: "Add /rag-tailor as new endpoint", description: "Keep original /tailor (non-RAG). Add /rag-tailor for the enhanced version. Let frontend choose which to use", category: "Build", estimated_minutes: 30, priority: "Low" },
      ]
    },
    {
      day: 18, week: 3, title: "Workflow Orchestration",
      objective: "Introduce step-based flow (index → compare → generate), add robust error handling",
      tasks: [
        { title: "Define JobWorkflow class", description: "Orchestrate 3 steps: step1_index(job), step2_compare(resume, job_id), step3_generate(resume, job_id).", category: "Build", estimated_minutes: 90, priority: "High" },
        { title: "Add timeout handling", description: "Wrap Gemini calls with asyncio.wait_for(timeout=30). Return 504 if timeout.", category: "Build", estimated_minutes: 45, priority: "High" },
        { title: "Add retry logic with exponential backoff", description: "Retry Gemini calls up to 3 times on rate limit errors. Backoff: 1s, 2s, 4s. Use tenacity library", category: "Build", estimated_minutes: 45, priority: "Medium" },
        { title: "Add workflow status tracking", description: "Store workflow state per job in DB: pending, indexing, comparing, generating, complete, failed.", category: "Build", estimated_minutes: 60, priority: "Medium" },
      ]
    },
    {
      day: 19, week: 3, title: "Job Pipeline UX",
      objective: "Build a pipeline view showing jobs by status (to review, applied, interviewed)",
      tasks: [
        { title: "Add application_status to Job model", description: "New field: application_status with values: saved, to_apply, applied, interview, offer, rejected.", category: "Build", estimated_minutes: 30, priority: "High" },
        { title: "Build Kanban/pipeline view", description: "Columns: Saved → To Apply → Applied → Interview → Offer. Click to move jobs between stages", category: "Build", estimated_minutes: 120, priority: "High" },
        { title: "Job detail panel", description: "Click a job card to open detail panel: JD text, AI suggestions, generated cover letter, notes.", category: "Build", estimated_minutes: 90, priority: "High" },
        { title: "Add PATCH /jobs/:id/status endpoint", description: "Update application_status. Return updated job. Call from frontend when dragging/clicking stage change", category: "Build", estimated_minutes: 30, priority: "Medium" },
      ]
    },
    {
      day: 20, week: 3, title: "Design Decisions + Tradeoffs",
      objective: "Document architectural decisions, compare alternatives, add Design Decisions to README",
      tasks: [
        { title: "Document: Vector store vs substring search", description: "Why Chroma/pgvector? Semantic similarity vs keyword matching. When substring is fine (small corpus).", category: "Profile/Marketing", estimated_minutes: 45, priority: "Medium" },
        { title: "Document: FastAPI vs Node.js for backend", description: "Pros: Python ecosystem for ML/LLM, Pydantic validation, async support.", category: "Profile/Marketing", estimated_minutes: 30, priority: "Medium" },
        { title: "Document: LLM choice tradeoffs", description: "Gemini Flash vs Pro vs local models. Cost per call, latency, quality. When to use each tier.", category: "Profile/Marketing", estimated_minutes: 30, priority: "Medium" },
        { title: "Add Design Decisions section to README", description: "3-4 clear decision blocks: problem, options considered, choice made, rationale.", category: "Profile/Marketing", estimated_minutes: 45, priority: "High" },
      ]
    },
    {
      day: 21, week: 3, title: "Resilience + Input Limits",
      objective: "Add rate limiting, input size validation, clear error messages",
      tasks: [
        { title: "Add in-memory rate limiting", description: "pip install slowapi. Limit /tailor to 10 req/min per IP. Return 429 with retry-after header", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Add input size limits", description: "Max resume_text: 10,000 chars. Max JD text: 5,000 chars. Return 400 with clear message if exceeded.", category: "Build", estimated_minutes: 30, priority: "High" },
        { title: "Improve error messages", description: "All errors should be user-readable. No stack traces in prod. Map internal codes to friendly messages", category: "Build", estimated_minutes: 45, priority: "Medium" },
        { title: "Add request validation middleware", description: "Validate Content-Type header. Check request body isn't empty. Add X-Request-ID header for tracing", category: "Build", estimated_minutes: 30, priority: "Low" },
      ]
    },
    {
      day: 22, week: 4, title: "Basic LLM Evals",
      objective: "Design evaluation harness with test cases, build eval script, run and analyze results",
      tasks: [
        { title: "Design eval test cases", description: "Create eval_cases.json with 5+ test cases: resume + JD + expected_characteristics. Cover different industries", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Build eval runner script", description: "eval.py: load test cases, call /tailor for each, check: bullet count (4-6), word count <200, contains JD keywords.", category: "Build", estimated_minutes: 90, priority: "High" },
        { title: "Run evals and analyze failures", description: "Run eval.py. Document failure cases. Which prompts fail? Iterate on prompt", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Add eval to CI/CD pipeline", description: "Add eval script to GitHub Actions. Run on PR merges. Alert if score drops below 80%.", category: "Build", estimated_minutes: 45, priority: "Medium" },
      ]
    },
    {
      day: 23, week: 4, title: "Logging + Analysis Dashboard",
      objective: "Add structured request/usage logging, build simple admin metrics page",
      tasks: [
        { title: "Implement structured logging", description: "Log anonymized request data: endpoint, latency_ms, status, timestamp. No resume content, no PII.", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Build admin metrics page", description: "Protected /admin route. Show: request volume chart, avg latency by endpoint, top error types.", category: "Build", estimated_minutes: 90, priority: "Medium" },
        { title: "Add failure rate alerting", description: "If error rate > 10% in 5 min window, log a WARNING. Add to health check response.", category: "Build", estimated_minutes: 45, priority: "Low" },
      ]
    },
    {
      day: 24, week: 4, title: "Security + Auth Basics",
      objective: "Add JWT auth or magic link, protect routes, implement PII minimization",
      tasks: [
        { title: "Add JWT authentication", description: "pip install python-jose. POST /auth/login returns JWT. Include in headers: Authorization: Bearer <token>.", category: "Build", estimated_minutes: 120, priority: "High" },
        { title: "Protect sensitive routes", description: "Add auth dependency to: /tailor, /jobs, /compare, /admin. Return 401 if missing/invalid token.", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "PII minimization in logs", description: "Never log: resume_text, job_description, email. Log only: request_id, endpoint, status, latency.", category: "Build", estimated_minutes: 45, priority: "High" },
        { title: "Review OWASP Top 10 for this app", description: "Check: SQL injection (using ORM), XSS, CORS, secrets management. Document findings", category: "Build", estimated_minutes: 45, priority: "Medium" },
      ]
    },
    {
      day: 25, week: 4, title: "LinkedIn + GitHub Polish",
      objective: "Update LinkedIn headline/about/featured, clean GitHub profile, pin repo",
      tasks: [
        { title: "Update LinkedIn headline", description: "New headline: 'Full-Stack Engineer | Building AI Job Search Copilot (Next.js, FastAPI, LLMs, RAG)'", category: "Profile/Marketing", estimated_minutes: 15, priority: "High" },
        { title: "Rewrite LinkedIn About section", description: "3 paragraphs: who you are, what you built and why, what you're looking for. Include: Next.js, FastAPI, Gemini, RAG.", category: "Profile/Marketing", estimated_minutes: 60, priority: "High" },
        { title: "Add GitHub + demo to LinkedIn Featured", description: "Screenshot or screen recording of the app in action. Link to GitHub repo. Consider a Loom demo video (2 min)", category: "Profile/Marketing", estimated_minutes: 45, priority: "High" },
        { title: "Clean GitHub profile README", description: "Add: what you build, current project (this app), tech stack badges. Pin this repo.", category: "Profile/Marketing", estimated_minutes: 45, priority: "Medium" },
      ]
    },
    {
      day: 26, week: 4, title: "Case Study Write-Up",
      objective: "Write detailed case study with architecture diagram, technical decisions, and future roadmap",
      tasks: [
        { title: "Write problem + motivation section", description: "2-3 paragraphs on the pain point. Personal story makes it real", category: "Profile/Marketing", estimated_minutes: 30, priority: "High" },
        { title: "Document architecture with diagram", description: "Final architecture: Next.js → FastAPI → Gemini + Chroma + SQLite. Include data flow. Use draw.io or Excalidraw", category: "Profile/Marketing", estimated_minutes: 60, priority: "High" },
        { title: "Write key features + flows section", description: "Describe 5 main flows with diagrams or step-by-step. Include screenshots. Code snippets for interesting parts", category: "Profile/Marketing", estimated_minutes: 60, priority: "High" },
        { title: "Write 'What I'd do next' section", description: "If this were a startup: multi-user auth, email integration, job board API scrapers, LLM fine-tuning.", category: "Profile/Marketing", estimated_minutes: 30, priority: "Medium" },
      ]
    },
    {
      day: 27, week: 4, title: "Interview Story Practice",
      objective: "Practice explaining the project in 60s, 5min, 15min formats",
      tasks: [
        { title: "Practice 60-second pitch", description: "Record yourself on Loom. Cover: what problem, what you built, key tech (RAG, Gemini, FastAPI), result. Iterate 3 times.", category: "Interview Prep", estimated_minutes: 45, priority: "High" },
        { title: "Practice 5-minute walkthrough", description: "Screen share + narrate the app. Show: inputs → Gemini call → RAG retrieval → outputs.", category: "Interview Prep", estimated_minutes: 60, priority: "High" },
        { title: "Prepare deep-dive answers", description: "Prepare 2-min answers for: 'How does the RAG work?', 'Why Gemini vs GPT-4?', 'How would you scale this?'", category: "Interview Prep", estimated_minutes: 60, priority: "High" },
        { title: "Practice explaining AI tooling usage", description: "How you used AI to build faster, where it helped, where it created problems.", category: "Interview Prep", estimated_minutes: 30, priority: "Medium" },
      ]
    },
    {
      day: 28, week: 4, title: "Systems + Backend Depth",
      objective: "Review API design, DB modeling, draw scaling architecture for this app",
      tasks: [
        { title: "Study API design principles", description: "Review: REST vs GraphQL, versioning strategy (/api/v1), pagination patterns, idempotency.", category: "Interview Prep", estimated_minutes: 60, priority: "High" },
        { title: "Study DB modeling patterns", description: "Review: normalization levels, index strategy, N+1 query problem, connection pooling.", category: "Interview Prep", estimated_minutes: 60, priority: "High" },
        { title: "Design scaled architecture diagram", description: "Draw how you'd scale this to 10,000 users: job queue for Gemini calls (Celery/Redis), read replicas, CDN.", category: "Interview Prep", estimated_minutes: 75, priority: "Medium" },
        { title: "Practice system design interview", description: "Do a mock: design your own app from scratch in 45 min. Cover: requirements, API design, data model, scaling.", category: "Interview Prep", estimated_minutes: 60, priority: "Medium" },
      ]
    },
    {
      day: 29, week: 4, title: "Interview Drills",
      objective: "2 LeetCode mediums, 1 mock system design, AI-specific Q&A prep",
      tasks: [
        { title: "LeetCode medium #1", description: "Pick from: Sliding Window, BFS/DFS, DP. Focus on clean code + talking through approach. Time: 30 min", category: "Interview Prep", estimated_minutes: 45, priority: "High" },
        { title: "LeetCode medium #2", description: "Different category than #1. Practice explaining solution out loud as you code. Discuss time/space complexity", category: "Interview Prep", estimated_minutes: 45, priority: "High" },
        { title: "AI/ML interview Q&A prep", description: "Prepare crisp answers: What is RAG? What's an embedding? How do you evaluate an LLM output? Token limits?", category: "Interview Prep", estimated_minutes: 60, priority: "High" },
        { title: "Behavioral questions prep", description: "Prepare STAR stories using this project: debugging, tech decision under ambiguity, learning something new quickly.", category: "Interview Prep", estimated_minutes: 45, priority: "Medium" },
      ]
    },
    {
      day: 30, week: 4, title: "Final Hardening + Launch",
      objective: "Fix all outstanding bugs, stabilize deployment, record demo video, start active job search",
      tasks: [
        { title: "Fix all outstanding bugs", description: "Go through your struggle logs from the past 30 days. Address every known bug. Test the full app flow from scratch", category: "Build", estimated_minutes: 90, priority: "High" },
        { title: "Update README + deployment", description: "Final README pass: correct all setup steps, update screenshots, verify badges work. Redeploy both frontend and backend", category: "Build", estimated_minutes: 60, priority: "High" },
        { title: "Record clean demo video", description: "2-3 min Loom video: narrate problem → show app → demo key features → mention tech. Upload to YouTube unlisted.", category: "Profile/Marketing", estimated_minutes: 60, priority: "High" },
        { title: "Start using app for your own job search", description: "Apply to 3 jobs using the app. Note where it saves time and where it falls short.", category: "Applications/Networking", estimated_minutes: 90, priority: "High" },
        { title: "Send 5 outreach messages on LinkedIn", description: "Message engineers at target companies. Mention you built this tool. Ask for a 15-min call.", category: "Applications/Networking", estimated_minutes: 60, priority: "High" },
      ]
    },
  ];

  for (const day of roadmap) {
    const dayResult = await c.execute({
      sql: 'INSERT INTO plan_days (day_number, title, objective, week) VALUES (?, ?, ?, ?)',
      args: [day.day, day.title, day.objective, day.week],
    });
    const dayId = Number(dayResult.lastInsertRowid);
    for (const task of day.tasks) {
      await c.execute({
        sql: 'INSERT INTO tasks (plan_day_id, title, description, category, estimated_minutes, priority) VALUES (?, ?, ?, ?, ?, ?)',
        args: [dayId, task.title, task.description, task.category, task.estimated_minutes, task.priority],
      });
    }
  }
}
