# Job Application CRM — Project Constitution

## Auto-PM Instruction
**At the start of every new Claude Code session, proactively run a PM review before doing anything else.** Check git state, read AGENT_LOG.md, report project health to the CEO, and recommend the next task.

---

## Project Purpose
A personal, fully local job application CRM that tracks applications, auto-links emails from Outlook, classifies them with AI, and suggests pipeline stage changes. Designed to run on your machine with zero external hosting or persistent cloud state.

---

## Tech Stack
- **Backend:** Python 3.11 + Flask (localhost:5000)
- **Database:** SQLite with WAL mode (jobs.db)
- **Frontend:** React + Vite (localhost:3000) with shadcn/ui + Tailwind CSS
- **Email:** Microsoft Graph API (Outlook, personal accounts)
- **AI:** Google Gemini API (free tier, `gemini-1.5-flash`)
- **Scheduler:** APScheduler (2 AM daily + 4-hour startup fallback)
- **Version Control:** Git + GitHub (coordinated branches)

---

## Three-Role Structure

| Role | Who | Invokes | Authority |
|------|-----|---------|-----------|
| **CEO** | You (user) | `/pm [request]` only | Final decision on all work + major design decisions |
| **PM** | Claude in PM mode | `/dev TASK-NNN` (when work approved) | Reviews work, plans next steps, checks health, invokes Dev, escalates blockers |
| **Dev** | Claude in Dev mode | (invoked by PM) | Executes task specs with full tools, autonomous, reports + continues to next queued task |

### CEO
- Invokes `/pm` for reviews and planning
- Approves work and decisions via chat (PM invokes Dev, not CEO)
- Runs `./scripts/codex-task.sh` to bring in Codex
- Approves all major decisions documented in `.claude/decisions/log.md`

### PM — `/pm`
- Reviews completed work against task specs
- Checks project health (blockers, bugs, test status, drift)
- Creates task specs in `.claude/tasks/queue.md`
- Reports to CEO in executive summary format
- Pushes back on scope creep
- Escalates architectural changes to CEO
- **Does NOT write application code** — only reads code + writes to `.claude/` files and task queue

### Dev — `/dev`
- Executes the specific task spec passed as `$ARGUMENTS`
- Has full tool access (bash, edit, write, git, etc.)
- Runs `scripts/pre-task-check.sh` as FIRST action every session
- Appends to `AGENT_LOG.md` when starting and finishing
- **Autonomous execution** — completes the full task spec, then reports a summary. Does NOT check in mid-task unless it hits a blocker it cannot resolve without CEO input.
- Stays within task scope — flags blockers instead of improvising
- **Does NOT update task specs, decision log, or AGENT_LOG directly** — those are PM/CEO only

---

## Codex CLI Integration (Third-Party Contractor)

Codex is brought in via `./scripts/codex-task.sh "task description"` for specialized work.

**Guardrails:**
- Always works on `codex/[task-slug]` branch — never touches `main`
- Reads `CONTRACTOR_BRIEF.md` for project context and bounds
- After finishing: PM must review the branch before Dev can continue
- Pre-task-check warns Dev if unmerged Codex branches exist

---

## State Files (Coordination Layer)

All agent coordination happens through shared markdown files in `.claude/`:

| File | Purpose | Written by | Read by |
|------|---------|-----------|---------|
| `.claude/tasks/queue.md` | Task specs with status | PM | Dev + CEO |
| `.claude/decisions/log.md` | Decision trail + CEO approvals | PM | All |
| `AGENT_LOG.md` | Append-only log of all agent activity | All | All |
| `CONTRACTOR_BRIEF.md` | Auto-generated project snapshot for Codex | scripts/codex-task.sh | Codex |

---

## Current Project Status

### Phase 1: Backend Core ✅ COMPLETE (untested)
All 7 core backend modules written:
- `backend/models.py` — 6-table SQLite schema, WAL mode, CRUD helpers
- `backend/config.py` — .env loading, token paths, logging
- `backend/auth.py` — MS Graph OAuth2 PKCE for personal accounts
- `backend/gemini_classifier.py` — email classification + rate limiter
- `backend/application_linker.py` — domain/keyword/semantic matching
- `backend/email_processor.py` — full fetch/classify/link/suggest pipeline
- `backend/app.py` — Flask REST API + APScheduler (2 AM daily + 4h startup check)

**Status:** Code written, NOT YET TESTED. Known bugs exist (missing methods, memory leaks, test isolation).

### Phase 1b: Backend Tests ✅ COMPLETE
All test modules written but skipped execution during code write phase:
- `tests/test_models.py` — 6+ test classes covering CRUD and schema
- `tests/test_linker.py` — matching logic tests
- `tests/test_api.py` — route tests
- `tests/conftest.py` — in-memory SQLite fixtures, sample data

### Phase 2: Frontend Scaffold ✅ COMPLETE
Vite + React boilerplate ready:
- `frontend/package.json` — all dependencies (React, Vite, shadcn/ui, Tailwind, DnD, Axios)
- `frontend/vite.config.js` — proxy `/api` to localhost:5000
- `frontend/tailwind.config.js` + `postcss.config.js` — styling setup
- `frontend/src/main.jsx`, `App.jsx`, `api.js` — React entry points + API client
- Tailwind colors configured

**Status:** Shell ready, UI components not yet built.

### Phase 2 Remaining: UI Components
- [ ] TASK-002: Build KanbanBoard + ApplicationCard (4-column drag-and-drop)
- [ ] TASK-003: Build CardDetail (emails + interactions)
- [ ] TASK-004: Build NewApplicationForm modal
- [ ] TASK-005: Build AddInteraction modal
- [ ] TASK-006: Build UnlinkedEmailsTray
- [ ] TASK-007: Build Settings page
- [ ] TASK-008: Error/loading states

### Phase 3: Polish
- [ ] TASK-009: setup.sh — one-command installer
- [ ] TASK-010: README — local setup + API key guide

---

## Git Workflow

- **`main`** — reviewed, approved code only. CEO merges after PM approval.
- **`codex/[task-slug]`** — contractor branches. Always reviewed by PM before merge.
- **`feature/[task-slug]`** — Dev work branches (if needed for longer tasks).

---

## Next Immediate Steps

1. **CEO:** Review the project health with `/pm review current state`
2. **CEO:** Approve work with "Proceed with TASK-001" (or similar)
3. **PM:** Invokes Dev autonomously; Dev executes TASK-001 through task queue
4. **Ongoing:** Dev continues through task queue automatically; PM/CEO monitor via reports

---

## How to Use This Architecture

### Start of Session
```
/pm review current state
→ PM checks git, reads AGENT_LOG.md, reports health + recommends next task
```

### When CEO Approves Work
```
CEO: "Proceed with TASK-001"
→ PM invokes: /dev TASK-001
→ Dev executes task autonomously, reports, then continues to next queued task automatically
→ CEO receives task completion reports + final summary when queue is exhausted
```

### Manual Review Between Tasks (Optional)
```
/pm check status
→ PM audits Dev's work, confirms quality, updates task status
```

### Bring in Codex
```
./scripts/codex-task.sh "task description"
→ Branch created, brief generated, you run Codex CLI
→ /pm review codex/[branch] before merging
```

---

## Critical Files to Know

- `CLAUDE.md` (this file) — auto-loaded every session
- `.claude/commands/pm.md` — PM persona instructions
- `.claude/commands/dev.md` — Dev persona instructions
- `.claude/tasks/queue.md` — active task specs
- `.claude/decisions/log.md` — decision trail
- `AGENT_LOG.md` — activity log (shared awareness)
- `scripts/pre-task-check.sh` — runs before any agent work (git state check)
- `scripts/codex-task.sh` — Codex invocation + branch/brief setup

---

## Architectural Decisions

For the full architectural rationale, see `/Users/nateb/.claude/plans/linear-popping-whistle.md`.

Key decisions:
- SQLite WAL mode for concurrent Flask + APScheduler access
- Gemini classification with 1 req/sec shared rate limiter (classifier + linker)
- Email linking: domain match (0.9) > keyword match (0.7) > semantic match (variable) — ambiguous matches sent to unlinked tray
- Multi-match detection: if >1 application matches with confidence > 0.7, email goes to unlinked tray for manual review
- MS Graph API: personal account OAuth PKCE, request plain text body, handle pagination + 429 throttling
- Frontend: shadcn/ui + Tailwind for consistency, Vite for speed, optimistic updates with revert on error
