# Task Queue

## Task Numbering Convention

- **Sequential Naming:** TASK-001, TASK-002, ..., TASK-NNN (no reuse)
- **Statuses:** `queued` (waiting to start), `in-progress` (actively being worked on), `completed` (done and verified)
- **Requirements:** Any agent starting work MUST claim a task ID first by updating this file
- **Concurrency:** Parallel tasks are allowed — each gets a unique ID and separate log entry in AGENT_LOG.md
- **Agent Logging:** Every AGENT_LOG.md entry must include task ID: `[YYYY-MM-DD HH:MM] AGENT-TYPE action | task: TASK-NNN | detail`

---

## Current In-Progress Task

(No tasks currently in progress — queue is empty)

---

## Completed Tasks ✅

## TASK-011: MS Graph OAuth + Email Sync Integration
- **Status:** completed
- **Priority:** high (blocking feature)
- **Completed by:** CODEX
- **Files modified:**
  - backend/auth.py (device code flow, pagination fix using @odata.nextLink)
  - backend/app.py (auth endpoints: /api/auth/initiate, /api/auth/poll, /api/cancel-email-sync, /api/gemini/health)
  - backend/email_processor.py (per-email progress updates, cancel support, configurable progress interval)
  - backend/models.py (SyncLog.update_progress method, cancelled status support, migration)
  - backend/config.py (MS Graph authority for personal accounts)
  - frontend/src/Settings.jsx (Outlook connect UI, device code display, sync progress with ETA, cancel button, Gemini Health panel)
  - frontend/src/api.js (new endpoints, configurable VITE_API_BASE)
  - .env / .env.example (GEMINI_MODEL, SYNC_PROGRESS_EVERY, VITE_API_BASE)
- **What was implemented:**
  - Microsoft Graph device code authentication (personal outlook.com accounts)
  - Email fetching with correct pagination (@odata.nextLink handling)
  - Per-email sync progress updates with ETA calculation
  - Cancel sync support (backend + UI)
  - Gemini API health check endpoint
  - Configurable Gemini model and sync progress interval
  - Frontend API base URL configurable via environment
- **Acceptance Criteria:** ✅ All met
  - Device code flow working with user_code display
  - Email pagination correct (using full nextLink URLs)
  - Sync progress displayed with ETA
  - Cancel button functional
  - Gemini health check working
  - All config values exposed via .env

## TASK-001: Fix known backend bugs
- **Status:** completed
- **Priority:** high
- **Files to modify:** backend/models.py, backend/app.py, tests/conftest.py
- **Spec:**
  - Add missing `Email.get_by_id()` method to models.py (read single email by ID)
  - Fix `/api/run-email-sync` memory leak — new BackgroundScheduler created per request (should reuse scheduler instance)
  - Fix test DB isolation — `conftest.py` calls non-existent `Email.get_by_id()` in fixture
  - Fix `StageSuggestion.confirm()` missing commit — adds to transaction but doesn't call db.commit()
- **Acceptance Criteria:**
  - `pytest tests/ -v` passes with 0 failures
  - All 4 bugs resolved and verified
  - No new test failures introduced

---

## TASK-002: Build KanbanBoard component
- **Status:** queued
- **Priority:** medium
- **Files:** frontend/src/KanbanBoard.jsx, frontend/src/ApplicationCard.jsx
- **Spec:**
  - Implement 4-column kanban board using @hello-pangea/dnd
  - Columns: "Submitted", "More Info Required", "Interview Started", "Denied+Offered"
  - Render application cards with company, role, date applied, and pending suggestion badge
  - On drop: fire `PATCH /api/applications/:id` with new status
  - Optimistic UI update — if PATCH fails, revert the card
  - Use shadcn components (Card, Button, Badge)
- **Acceptance Criteria:**
  - Cards render in correct columns
  - Drag a card between columns, see status update in backend
  - Refresh page — status persists (pulled from API)
  - On network error, card reverts to original column

---

## TASK-003: Build CardDetail panel
- **Status:** queued
- **Priority:** medium
- **Files:** frontend/src/CardDetail.jsx, frontend/src/AddInteraction.jsx
- **Spec:**
  - Click a card → slide-out sheet (shadcn Sheet component) from right side
  - Show: company name, role, date submitted, current status
  - Tab 1: Emails — list all linked emails (subject, sender, date)
  - Tab 2: Interactions — timeline of phone calls, notes, texts with timestamps
  - Tab 3: Add Note — button to add manual note / phone call / text
  - Close button or click outside to close
- **Acceptance Criteria:**
  - Sheet opens/closes smoothly
  - Emails list shows correct data from API
  - Interactions render in chronological order
  - Can add a note and see it appear immediately

---

## TASK-004: Build NewApplicationForm modal
- **Status:** queued
- **Priority:** medium
- **Files:** frontend/src/NewApplicationForm.jsx, frontend/src/App.jsx
- **Spec:**
  - "[+ New Application]" button in header
  - Click → Dialog (shadcn Dialog) opens
  - Fields: company_name, job_title, date_submitted (date picker), job_url (optional), company_domain (optional)
  - Submit → `POST /api/applications`
  - On success: close dialog, new card appears in Submitted column
  - On error: show error toast (shadcn Toast)
- **Acceptance Criteria:**
  - Form renders with all fields
  - Submit fires POST correctly
  - New application appears in kanban immediately

---

## TASK-005: Build AddInteraction modal
- **Status:** queued
- **Priority:** medium
- **Files:** frontend/src/AddInteraction.jsx
- **Spec:**
  - From CardDetail panel, "Add" button opens modal
  - Type selector: phone_call, text_message, manual_note
  - Content field (textarea)
  - Datetime picker (occurred_at)
  - Submit → `POST /api/applications/:id/interactions`
  - New interaction appears in list immediately
- **Acceptance Criteria:**
  - Modal opens from CardDetail
  - All field types work (date, time, textarea)
  - Submit fires POST correctly

---

## TASK-006: Build UnlinkedEmailsTray
- **Status:** queued
- **Priority:** medium
- **Files:** frontend/src/UnlinkedEmailsTray.jsx
- **Spec:**
  - Collapsible panel at bottom of kanban
  - Shows emails with no application_id
  - Each row: sender, subject, date, "Assign to" dropdown
  - Dropdown searches/selects an application
  - On select: `PATCH /api/emails/:id/link` → email removed from tray, appears in card
  - Badge showing count of unlinked emails
- **Acceptance Criteria:**
  - Panel toggles open/closed
  - Unlinked emails list is correct
  - Assigning an email removes it from tray

---

## TASK-007: Build Settings page
- **Status:** queued
- **Priority:** low
- **Files:** frontend/src/Settings.jsx, frontend/src/App.jsx
- **Spec:**
  - Navigation link or menu to Settings
  - Show last sync timestamp
  - Show sync log table from `GET /api/sync-logs` (last 10 syncs)
  - Columns: Date, Duration, Emails Processed, Apps Created, Status
  - "Run Sync Now" button → `POST /api/run-email-sync`
  - Button shows loading state while sync in progress
  - Poll status until complete, show success message
- **Acceptance Criteria:**
  - Settings page loads with sync logs
  - Manual sync button works and shows status
  - Sync log updates after completion

---

## TASK-008: Error/loading states
- **Status:** queued
- **Priority:** low
- **Files:** frontend/src/**/*.jsx
- **Spec:**
  - Add Skeleton components (shadcn) while APIs load
  - Add Toast (shadcn) for all error messages
  - Handle network errors gracefully (show toast, don't crash)
  - Show loading spinners on buttons during async operations
  - Disable forms while submitting
- **Acceptance Criteria:**
  - Kanban shows skeleton while loading
  - API errors show as toasts
  - No console errors on network failures

---

## TASK-009: Create setup.sh installer
- **Status:** queued
- **Priority:** low
- **Files:** setup.sh
- **Spec:**
  - One-command setup for first-time users
  - Install Python deps: `pip install -r backend/requirements.txt`
  - Install Node deps: `cd frontend && npm install`
  - Create .env from .env.example
  - Walk user through getting MS Graph Client ID + Gemini API key
  - Create logs/ directory
  - Initialize SQLite DB: `python backend/models.py` (or create_tables call)
- **Acceptance Criteria:**
  - Script runs without error on fresh clone
  - User can run Flask + frontend after setup

---

## TASK-010: Write comprehensive README
- **Status:** queued
- **Priority:** low
- **Files:** README.md
- **Spec:**
  - Project overview
  - Tech stack summary
  - Setup instructions (reference setup.sh)
  - Getting API keys: MS Graph (Azure app registration steps) + Gemini
  - Running the app: Flask on 5000, Vite on 3000
  - How the CRM works (screenshots or flow diagrams if possible)
  - Architecture overview + link to CLAUDE.md
  - Contributing notes (role structure, how to use /pm and /dev)
  - Troubleshooting common issues
- **Acceptance Criteria:**
  - README is complete, clear, and actionable
  - Someone new could set up the project from README alone

---

## Done ✅
- [x] Initialize project structure
- [x] Phase 1: Backend core (7 modules)
- [x] Phase 1b: Backend tests
- [x] Phase 2: Frontend scaffold
- [x] Multi-agent infrastructure setup (CLAUDE.md, /pm, /dev, scripts)
