# Job Application CRM — Contractor Brief

## ⚠️ Before You Start

Any agent (Codex, Claude, external contractor) joining this project **MUST read these files first**:

1. **[CLAUDE.md](CLAUDE.md)** — Project architecture, three-role structure (CEO/PM/Dev), and coordinate files
2. **[.claude/tasks/queue.md](.claude/tasks/queue.md)** — Active task registry with specs and status
3. **[AGENT_LOG.md](AGENT_LOG.md)** — Recent activity log (last 10 entries show what was just completed)

**Then:** Claim or create a task. **No work without a task ID.** See "Task Naming Convention" in queue.md.

---

## Project Overview

**Job Application CRM** — A personal, fully local job application tracker that:
- Tracks job applications in a Kanban board (Submitted → Interview → Offer/Denial)
- Auto-syncs emails from Outlook via Microsoft Graph API
- Classifies emails with Google Gemini AI (application updates, rejections, interviews, etc.)
- Suggests pipeline stage changes based on email content
- Stores everything in local SQLite — no cloud dependencies

**Tech Stack:**
- Backend: Python 3.11 + Flask (localhost:5001)
- Frontend: React + Vite (localhost:3000)
- Database: SQLite with WAL mode
- Email: Microsoft Graph API (personal Outlook accounts)
- AI: Google Gemini (free tier)
- Scheduler: APScheduler (2 AM daily sync + 4-hour startup fallback)

---

## Architectural Highlights

- **Modular backend:** Separate auth, classifier, linker, processor, and API modules
- **Optimistic UI:** Frontend updates immediately; reverts on error
- **Local-first:** No external services beyond APIs (Graph, Gemini)
- **Concurrent safe:** SQLite WAL mode + scheduler isolation
- **Three-agent structure:** CEO (user) → PM (planner) → Dev (executor), plus Codex (contractor)

---

## Current Status

- ✅ **Phase 1:** Backend core (7 modules) + tests complete
- ✅ **Phase 2:** Frontend scaffold complete; all UI components built (Kanban, cards, modals, settings)
- 🔄 **Phase 3 (Current):** MS Graph OAuth + email sync integration (TASK-011, in-progress)

**Latest work:** Device code authentication working, email pagination fixed, awaiting first full sync run.

---

## Key Files & Responsibilities

| File | Purpose |
|------|---------|
| `.claude/tasks/queue.md` | Task specs + status (your source of truth for "what's in scope") |
| `AGENT_LOG.md` | Append-only activity log (see what others finished) |
| `backend/auth.py` | MS Graph OAuth + email fetch |
| `backend/app.py` | Flask REST API + scheduler |
| `backend/models.py` | SQLite schema + CRUD |
| `frontend/src/App.jsx` | Main React app + routing |
| `CLAUDE.md` | Full architecture + rules |

---

## Task Workflow

1. **Read the queue:** Open `.claude/tasks/queue.md`
2. **Find a queued task:** Look for `status: queued`
3. **Create or claim:** Add your task ID (next sequential TASK-NNN) or pick an existing one
4. **Work autonomously:** Implement to acceptance criteria
5. **Log completion:** Append to `AGENT_LOG.md` in format: `[YYYY-MM-DD HH:MM] AGENT-TYPE action | task: TASK-NNN | details`
6. **Continue to next:** If queued tasks remain, start the next one

---

## Critical Rules

- **No work without a task ID** — claim one from queue.md before touching code
- **Concurrent tasks are OK** — each gets a unique TASK-NNN and separate log entry
- **Task IDs never reused** — sequence is permanent (TASK-001, TASK-002, ..., TASK-NNN)
- **All activity logged** — AGENT_LOG.md is the source of truth for who did what when
- **Scope is the task spec** — don't expand beyond acceptance criteria
- **Blockers halt work** — if you can't resolve something, document it and escalate to PM/CEO

---

## Getting Help

- **Project decision trail:** See `.claude/decisions/log.md`
- **Recent activity:** See last 10 entries in `AGENT_LOG.md`
- **Architecture questions:** Read `CLAUDE.md` section "Architectural Decisions"
- **Blocked?** Document the blocker in `.claude/tasks/queue.md` as a note, then report to PM

---

## Running the App Locally

```bash
# Backend (Flask on localhost:5001)
cd backend
pip install -r requirements.txt
python app.py

# Frontend (Vite dev server on localhost:3000)
cd frontend
npm install
npm run dev
```

Tests:
```bash
pytest tests/ -v          # Backend tests
npm run test              # Frontend tests (if configured)
```

---

## Environment Setup

See `.env.example` for required keys:
- `MS_GRAPH_CLIENT_ID` / `MS_GRAPH_CLIENT_SECRET` — Azure app registration
- `GEMINI_API_KEY` — Google AI Studio free tier key
- Database path, logging level, sync schedule

---

## Questions?

Before asking, check:
1. **CLAUDE.md** — answers most "how does this work?" questions
2. **AGENT_LOG.md** — recent entries show what just happened
3. **queue.md task specs** — acceptance criteria clarify what "done" means

If still stuck, document in queue.md and escalate to PM.

