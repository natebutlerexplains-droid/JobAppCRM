# Job Application CRM — Architecture

High-level system design and architectural decisions.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User's Machine                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │  React Frontend  │         │   Flask Backend  │             │
│  │  (Port 3000)     │◄───────►│   (Port 5001)    │             │
│  │  • Kanban Board  │  HTTP   │  • REST API      │             │
│  │  • Settings      │   JSON  │  • Email sync    │             │
│  │  • Email Tray    │         │  • Scheduling    │             │
│  └──────────────────┘         └──────────────────┘             │
│         △                             △                         │
│         │                             │                         │
│         │ (Vite Dev Server)           │ (APScheduler)           │
│         │                             │                         │
│  ┌──────────────────────────────────────────────┐              │
│  │         SQLite Database (jobs.db)            │              │
│  │  • Applications                              │              │
│  │  • Emails                                    │              │
│  │  • Interactions                              │              │
│  │  • Sync Logs                                 │              │
│  │  (WAL mode for concurrent access)           │              │
│  └──────────────────────────────────────────────┘              │
│                                                                  │
│  ┌──────────────────────────────────────────────┐              │
│  │    External APIs (Read-Only from User's    │              │
│  │    perspective)                              │              │
│  │  • Microsoft Graph (Outlook emails)          │              │
│  │  • Google Gemini (Email classification)      │              │
│  └──────────────────────────────────────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### Frontend (React + Vite)

**Structure:**
```
frontend/src/
├── App.jsx              # Main app, routing, state
├── KanbanBoard.jsx      # Drag-and-drop board
├── ApplicationCard.jsx  # Card component
├── CardDetail.jsx       # Right panel, tabs
├── AddInteraction.jsx   # Modal for interactions
├── NewApplicationForm.jsx # New app modal
├── UnlinkedEmailsTray.jsx # Bottom tray
├── Settings.jsx         # Sync, health, auth
├── api.js              # Axios wrapper
└── main.jsx            # React entry point
```

**Key Technologies:**
- **React 18** — Component-based UI
- **Vite** — Fast dev server and build tool
- **shadcn/ui** — Pre-built, accessible components
- **Tailwind CSS** — Utility-first styling
- **@hello-pangea/dnd** — Drag-and-drop for Kanban
- **Axios** — HTTP client with interceptors

**Design Patterns:**
- Functional components + hooks (useState, useEffect, useRef)
- API client abstraction in `api.js`
- Optimistic UI updates with rollback on error
- Debounced search (300ms) for performance

---

### Backend (Python + Flask)

**Structure:**
```
backend/
├── app.py               # Flask app, routes, scheduler
├── models.py            # SQLite schema, ORM-like methods
├── auth.py              # MS Graph OAuth2, email fetching
├── email_processor.py   # Email sync pipeline
├── gemini_classifier.py # Email classification
├── application_linker.py # Email-to-app matching
├── config.py            # Configuration, logging
└── requirements.txt     # Dependencies
```

**Key Technologies:**
- **Flask** — Lightweight REST API
- **SQLite with WAL** — Concurrent-safe local database
- **APScheduler** — Background job scheduling
- **MSAL** — Microsoft authentication library
- **google-generativeai** — Gemini API client

**Design Patterns:**
- Raw SQL with parameterized queries (no ORM)
- Factory methods in model classes (Application.create, etc.)
- Separate concerns: auth, classification, linking are modules
- Rate limiter on Gemini calls (1 req/sec max)

---

## Data Flow

### Email Sync Pipeline

```
1. User clicks "Run Sync Now" in Settings
   │
   ├─► Backend: POST /api/run-email-sync
   │   └─► APScheduler queues sync_emails_job()
   │       └─► EmailProcessor.process_emails()
   │
   2. EmailProcessor.process_emails():
   │   │
   │   ├─► MSGraphAPI.get_emails(days_back=30)
   │   │   └─► Fetch emails from Outlook (paginated)
   │   │   └─► Update sync log: emails_fetched=42
   │   │
   │   ├─► For each email:
   │   │   │
   │   │   ├─► GeminiClassifier.classify_email()
   │   │   │   └─► Call Gemini API
   │   │   │   └─► Return type + confidence
   │   │   │
   │   │   ├─► ApplicationLinker.link_email()
   │   │   │   ├─► Domain match? (confidence 0.9)
   │   │   │   ├─► Keyword match? (confidence 0.7)
   │   │   │   ├─► Semantic match? (variable)
   │   │   │   └─► Return app_id + confidence
   │   │   │
   │   │   └─► If linked:
   │   │       ├─► Insert/update email in DB
   │   │       ├─► Check for multi-match
   │   │       └─► Maybe suggest stage change
   │   │
   │   │   └─► If unlinked:
   │   │       └─► Email goes to unlinked tray
   │   │
   │   │   └─► Update sync log: emails_processed++
   │   │
   │   └─► SyncLog.update(): status=completed, finished_at=now
   │
   3. Frontend polls /api/sync-logs:
       ├─► Every 5 seconds during sync
       ├─► Display: "Syncing: 25/42 emails processed • ETA 3m 21s"
       └─► On completion: refresh UI with linked emails
```

### Kanban Drag-and-Drop

```
1. User drags card from "Submitted" to "Interview"
   │
   ├─► Frontend: Optimistic update
   │   └─► Display card in new column immediately
   │
   ├─► Frontend: PATCH /api/applications/42
   │   ├─► { "status": "interview" }
   │   │
   │   └─► Backend: Application.update_status(db, 42, "interview")
   │       └─► UPDATE applications SET status='interview'
   │
   ├─► Backend response: 200 OK
   │
   └─► If error:
       └─► Frontend reverts card to original column
```

---

## Database Schema

**6 tables, normalized design:**

### applications
```sql
CREATE TABLE applications (
  id INTEGER PRIMARY KEY,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  status TEXT DEFAULT 'submitted',  -- submitted, more_info_required, interview, denied, offered
  date_submitted DATE NOT NULL,
  company_domain TEXT,
  job_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### emails
```sql
CREATE TABLE emails (
  id INTEGER PRIMARY KEY,
  message_id TEXT UNIQUE,  -- Outlook message ID (dedup key)
  subject TEXT,
  body TEXT,
  sender TEXT,
  received_at TIMESTAMP,
  email_type TEXT,  -- application_confirmation, interview_request, rejection, offer, etc.
  classification_confidence REAL,
  application_id INTEGER,  -- NULL if unlinked
  linking_confidence REAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id)
)
```

### interactions
```sql
CREATE TABLE interactions (
  id INTEGER PRIMARY KEY,
  app_id INTEGER NOT NULL,
  type TEXT NOT NULL,  -- phone_call, text_message, manual_note
  content TEXT,
  occurred_at TIMESTAMP,
  suggested_stage_change TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (app_id) REFERENCES applications(id)
)
```

### stage_suggestions
```sql
CREATE TABLE stage_suggestions (
  id INTEGER PRIMARY KEY,
  app_id INTEGER NOT NULL,
  suggested_stage TEXT,
  confidence REAL,
  reasoning TEXT,
  status TEXT DEFAULT 'pending',  -- pending, confirmed, dismissed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (app_id) REFERENCES applications(id)
)
```

### processed_emails
```sql
CREATE TABLE processed_emails (
  id INTEGER PRIMARY KEY,
  message_id TEXT UNIQUE,  -- From Outlook
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### sync_logs
```sql
CREATE TABLE sync_logs (
  id INTEGER PRIMARY KEY,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP,
  status TEXT DEFAULT 'running',  -- running, completed, failed, cancelled
  emails_fetched INTEGER DEFAULT 0,
  emails_processed INTEGER DEFAULT 0,
  apps_created INTEGER DEFAULT 0,
  errors TEXT  -- JSON array of error strings
)
```

**Indexes:**
- `emails(message_id)` — Dedup on sync
- `emails(application_id)` — Fast lookup by app
- `applications(status)` — Filter by status
- `sync_logs(started_at DESC)` — Recent syncs first

**Concurrency:** SQLite WAL mode ensures reads don't block writes, and vice versa.

---

## Authentication Flow

### Device Code Flow (for personal Outlook accounts)

```
1. User clicks "Connect Outlook" in Settings
   │
   ├─► Frontend: POST /api/auth/initiate
   │
   ├─► Backend: MSGraphAuth.initiate_device_flow()
   │   │
   │   ├─► Call: app.initiate_device_flow()
   │   │   └─► Returns: user_code, verification_uri, device_code
   │   │
   │   └─► Return to frontend
   │
   ├─► Frontend displays:
   │   ├─► User code (large, monospace): ABC123DEF456
   │   └─► Link: https://microsoft.com/devicelogin
   │
   2. User opens link in browser, enters code, authenticates
   │
   3. Frontend starts polling:
   │   │
   │   └─► Every 3 seconds: POST /api/auth/poll
   │       │
   │       ├─► Backend: MSGraphAuth.poll_device_flow()
   │       │   │
   │       │   ├─► Call: app.acquire_token_by_device_flow(device_code)
   │       │   │   ├─► If success: save token to ~/.jobcrm/token.json
   │       │   │   ├─► If pending: keep polling
   │       │   │   └─► If denied: return error
   │       │   │
   │       │   └─► Return status: success/pending/error
   │       │
   │       └─► Frontend stops polling on success/error
   │
   4. On success:
      └─► Next sync will use cached token from ~/.jobcrm/token.json
          └─► Token auto-refreshes if expired
```

**Why device flow?**
- Personal accounts don't support username/password flow
- No redirect URI needed (good for localhost)
- User sees transparent OAuth in browser

---

## Email Classification & Linking

### Classification (Gemini)

```
Input: email subject + body + sender

Prompt:
  "Classify this job application email:
   From: recruiter@company.com
   Subject: Interview scheduled
   
   Return JSON: { "email_type": "...", "confidence": 0.0-1.0 }"

Output:
  {
    "email_type": "interview_request",  -- or: application_confirmation, rejection, offer, etc.
    "confidence": 0.88
  }
```

### Linking (Three-tier matching)

**Tier 1 — Domain match (0.9 confidence):**
```
Email from: recruiter@google.com
App domain: google.com
→ Match! Confidence: 0.9
```

**Tier 2 — Keyword match (0.7 confidence):**
```
Email subject: "Google Software Engineer role"
App company: "Google"
App role: "Software Engineer"
→ Keywords found. Confidence: 0.7
```

**Tier 3 — Semantic match (variable):**
```
Email: "We're excited to move forward..."
App: "Google SWE"

Gemini: "Does this email relate to this job?"
→ Variable confidence (0.5–0.95)
```

**Decision:**
```
If confidence >= 0.9 (domain):
  → Link to app (confidence: 0.9)
Else if confidence >= 0.7 (keyword):
  → Link to app (confidence: 0.7)
Else if confidence > 0.5 (semantic):
  → If only 1 match: link (confidence: X)
  → If multiple matches: send to unlinked tray
Else:
  → Send to unlinked tray (manual review)
```

---

## Scheduling

### Daily Sync at 2 AM

```
APScheduler (CronTrigger):
  Hour: 2
  Minute: 0
  
  Runs: sync_emails_job() every day at 2 AM local time
```

### Startup Sync Check

```
On app startup:
  Get last sync from SyncLog
  If not finished_at:
    → Sync is stuck, skip startup sync
  Else if hours_since_last_sync > 4:
    → Run sync immediately (user offline for 4+ hours)
  Else:
    → Skip (recent sync exists)
```

---

## External API Integrations

### Microsoft Graph (Email Fetching)

**Endpoint:** `GET https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages`

**Parameters:**
- `$top=50` — Batch size
- `$skip=50` — Pagination (first sync)
- `$orderBy=receivedDateTime DESC` — Newest first
- `$select=id,subject,from,bodyPreview,receivedDateTime`
- `$filter=receivedDateTime ge '{date}T00:00:00Z'` — Date range

**Pagination:**
- First request: returns `@odata.nextLink`
- Subsequent requests: use full nextLink URL (contains skip token)
- Stop when `@odata.nextLink` is absent

**Auth:** Bearer token from device code flow (cached locally)

### Google Gemini (Classification)

**Model:** `gemini-2.5-flash` (free tier)

**Rate limit:** 60 requests/minute

**Implementation:**
- Python SDK: `google.generativeai.GenerativeModel()`
- Request format: Plain text prompt, no multimodal
- Response format: Structured (JSON or plain text)

**Fallback:** If rate limited, queue email for next sync batch.

---

## Performance Considerations

### Email Sync Speed

**Baseline:** ~1–2 emails/second

**Bottleneck:** Gemini API latency (500–2000ms per request)

**Optimization strategies:**
- Batch classification (if API supports it)
- Parallel requests (if rate limit allows)
- Cache common patterns (e.g., "Google" → always "interview_request")

### Frontend Performance

**Large lists (500+ applications):**
- Current: All rendered in DOM
- Phase 5 fix: Virtual scrolling (only render visible items)
- Current workaround: Filter/search to reduce visible cards

### Database Performance

**Concurrent access:**
- SQLite WAL mode handles Flask + APScheduler simultaneously
- No locking issues (WAL = write-ahead log)
- Reads never block, writes queue

**Query optimization:**
- Indexed on: message_id, application_id, status, sync.started_at
- No complex joins (all queries are simple SELECT/INSERT/UPDATE)
- Results: <10ms per query on typical 1000-email database

---

## Security Model

### What's Stored Locally

```
~/.jobcrm/token.json          # Outlook OAuth token (sensitive!)
./jobs.db                      # All application + email data
./backend/.env                 # API keys, credentials
```

### What's Sent to External Services

- **MS Graph:** Only read from inbox (no write, no delete)
  - Email subjects, bodies, sender addresses
- **Gemini:** Only email text (subject + body + sender)
  - No application details, company names, or metadata

### Security Best Practices

1. **No external hosting** — data stays on your machine
2. **Token refresh** — auto-refreshes if expired
3. **No password storage** — OAuth only (token-based)
4. **Rate limiting** — prevents abuse
5. **Input validation** — all API inputs validated
6. **CORS restricted** — localhost only in dev

---

## Deployment Architectures

### Local Development

```
Same machine:
  Frontend (Port 3000) + Backend (Port 5001) + SQLite
  For development/testing
```

### Docker (Phase 5)

```
Two containers:
  1. Backend (Flask + Python)
  2. Frontend (Node + Vite build)
  
  Volumes:
    - SQLite DB (persistent)
    - Logs (persistent)
    - Token cache (persistent, shared)
```

### Production (systemd + Nginx)

```
Server:
  Backend: systemd service, gunicorn/uwsgi
  Frontend: static build, served by Nginx
  
  SSL: Let's Encrypt
  Logging: journalctl + file rotation
  Health checks: systemd/Nagios
```

---

## Future Architecture Improvements

- [ ] **Webhook receiver** — Accept forwarded emails (Phase 7)
- [ ] **Browser extension** — Capture from job boards (Phase 7)
- [ ] **Notification system** — In-app + browser alerts (Phase 7)
- [ ] **Caching layer** — Redis for session/rate limit state (optional)
- [ ] **Search index** — Elasticsearch for full-text email search (optional)
- [ ] **Analytics** — Prometheus metrics for monitoring (Phase 7)

---

See [CLAUDE.md](../CLAUDE.md) for development workflow and governance.

