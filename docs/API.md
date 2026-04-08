# Job Application CRM — API Reference

Complete REST API documentation for backend endpoints.

**Base URL:** `http://localhost:5001/api` (development)

---

## Authentication Endpoints

### POST /api/auth/initiate
Start Microsoft OAuth2 device code flow.

**Request:**
```http
POST /api/auth/initiate
```

**Response (200):**
```json
{
  "user_code": "ABC123",
  "device_code": "long-device-code-string",
  "verification_uri": "https://microsoft.com/devicelogin",
  "expires_in": 900,
  "interval": 5
}
```

**Use:** Display `user_code` and `verification_uri` to user. User visits link and enters code to authenticate.

---

### POST /api/auth/poll
Poll for device code flow completion.

**Request:**
```http
POST /api/auth/poll
```

**Response (200) — Still waiting:**
```json
{
  "status": "pending"
}
```

**Response (200) — Success:**
```json
{
  "status": "success",
  "message": "Authentication successful"
}
```

**Response (200) — Error:**
```json
{
  "status": "error",
  "message": "User denied access"
}
```

**Use:** Call every 3–5 seconds after initiating flow. Stop polling when status is not `pending`.

---

### GET /api/auth/status
Check if Outlook is connected.

**Request:**
```http
GET /api/auth/status
```

**Response (200) — Connected:**
```json
{
  "authenticated": true
}
```

**Response (200) — Not connected:**
```json
{
  "authenticated": false
}
```

---

## Application Endpoints

### GET /api/applications
List all job applications.

**Request:**
```http
GET /api/applications
```

**Response (200):**
```json
[
  {
    "id": 1,
    "company_name": "Google",
    "job_title": "Software Engineer",
    "status": "interview",
    "date_submitted": "2026-04-08",
    "company_domain": "google.com",
    "job_url": "https://careers.google.com/jobs/...",
    "created_at": "2026-04-08T10:30:00Z",
    "updated_at": "2026-04-09T14:22:00Z",
    "email_count": 3,
    "pending_suggestions": 1
  },
  ...
]
```

**Query Parameters (optional):**
- `?search=term` — Filter by company name or job title (case-insensitive)
- `?status=submitted` — Filter by status
- `?email_type=offer` — Filter by email type (future)

---

### POST /api/applications
Create a new job application.

**Request:**
```http
POST /api/applications
Content-Type: application/json

{
  "company_name": "Google",
  "job_title": "Software Engineer",
  "date_submitted": "2026-04-08",
  "company_domain": "google.com",
  "job_url": "https://careers.google.com/jobs/..."
}
```

**Required fields:**
- `company_name` (string, 1–200 chars)
- `job_title` (string, 1–200 chars)
- `date_submitted` (ISO date: YYYY-MM-DD)

**Optional fields:**
- `company_domain` (string)
- `job_url` (string, valid URL)

**Response (201):**
```json
{
  "id": 42,
  "company_name": "Google",
  "job_title": "Software Engineer",
  "status": "submitted",
  "date_submitted": "2026-04-08",
  "company_domain": "google.com",
  "job_url": "https://careers.google.com/jobs/...",
  "created_at": "2026-04-08T10:30:00Z",
  "updated_at": "2026-04-08T10:30:00Z",
  "email_count": 0,
  "pending_suggestions": 0
}
```

**Errors:**
- 400 — Missing required fields or invalid data
- 500 — Server error

---

### GET /api/applications/:id
Get a specific application.

**Request:**
```http
GET /api/applications/42
```

**Response (200):**
```json
{
  "id": 42,
  "company_name": "Google",
  ...
}
```

**Errors:**
- 404 — Application not found
- 500 — Server error

---

### PATCH /api/applications/:id
Update an application (status, domain, etc.).

**Request:**
```http
PATCH /api/applications/42
Content-Type: application/json

{
  "status": "interview"
}
```

**Updatable fields:**
- `status` (submitted, more_info_required, interview, denied, offered)
- `company_domain` (string)
- `job_url` (string)

**Response (200):**
```json
{
  "id": 42,
  "status": "interview",
  ...
}
```

**Errors:**
- 400 — Invalid status value or missing data
- 404 — Application not found
- 500 — Server error

---

### DELETE /api/applications/:id
Delete an application.

**Request:**
```http
DELETE /api/applications/42
```

**Response (200):**
```json
{
  "message": "Application deleted"
}
```

**Errors:**
- 404 — Application not found
- 500 — Server error

---

## Email Endpoints

### GET /api/applications/:id/emails
Get all emails linked to an application.

**Request:**
```http
GET /api/applications/42/emails
```

**Response (200):**
```json
[
  {
    "id": 101,
    "subject": "Your application for Software Engineer",
    "sender": "careers@google.com",
    "body": "Thank you for applying...",
    "email_type": "application_confirmation",
    "classification_confidence": 0.95,
    "received_at": "2026-04-08T15:00:00Z",
    "application_id": 42,
    "linking_confidence": 0.92
  },
  ...
]
```

---

### GET /api/emails/unlinked
Get all unlinked emails (no matched application).

**Request:**
```http
GET /api/emails/unlinked
```

**Response (200):**
```json
[
  {
    "id": 105,
    "subject": "Interview scheduled for Monday",
    "sender": "recruiter@company.com",
    "received_at": "2026-04-09T09:00:00Z",
    "application_id": null,
    "linking_confidence": null,
    "email_type": "interview_request"
  },
  ...
]
```

**Use:** Display in the Unlinked Emails Tray for manual linking.

---

### PATCH /api/emails/:id/link
Manually link an email to an application.

**Request:**
```http
PATCH /api/emails/105/link
Content-Type: application/json

{
  "app_id": 42
}
```

**Response (200):**
```json
{
  "message": "Email linked to application"
}
```

**Errors:**
- 400 — Missing `app_id`
- 404 — Email or application not found
- 500 — Server error

---

## Interaction Endpoints

### GET /api/applications/:id/interactions
Get all interactions (calls, notes, texts) for an application.

**Request:**
```http
GET /api/applications/42/interactions
```

**Response (200):**
```json
[
  {
    "id": 1,
    "app_id": 42,
    "type": "phone_call",
    "content": "Discussed compensation package",
    "occurred_at": "2026-04-09T14:00:00Z",
    "created_at": "2026-04-09T14:05:00Z",
    "suggested_stage_change": "offered"
  },
  {
    "id": 2,
    "app_id": 42,
    "type": "manual_note",
    "content": "Follow up on benefits",
    "occurred_at": "2026-04-09T15:00:00Z",
    "created_at": "2026-04-09T15:00:00Z",
    "suggested_stage_change": null
  }
]
```

---

### POST /api/applications/:id/interactions
Create a new interaction.

**Request:**
```http
POST /api/applications/42/interactions
Content-Type: application/json

{
  "type": "phone_call",
  "content": "Discussed compensation package",
  "occurred_at": "2026-04-09T14:00:00Z"
}
```

**Fields:**
- `type` (phone_call, text_message, manual_note) — required
- `content` (string, 1–5000 chars) — optional
- `occurred_at` (ISO timestamp) — optional, defaults to now
- `suggested_stage_change` (string) — optional, set by backend after analysis

**Response (201):**
```json
{
  "id": 3,
  "message": "Interaction created"
}
```

**Errors:**
- 400 — Invalid type or missing required fields
- 404 — Application not found
- 500 — Server error

---

## Sync Endpoints

### POST /api/run-email-sync
Manually trigger an email sync (runs asynchronously).

**Request:**
```http
POST /api/run-email-sync
```

**Response (202) — Sync started:**
```json
{
  "message": "Email sync started",
  "status": "running"
}
```

**Response (409) — Already running:**
```json
{
  "message": "Email sync already running",
  "status": "running",
  "sync_log_id": 5
}
```

**Use:** After starting, poll `/api/sync-logs` to check progress.

---

### POST /api/cancel-email-sync
Cancel a running email sync.

**Request:**
```http
POST /api/cancel-email-sync
```

**Response (202) — Cancel requested:**
```json
{
  "message": "Cancel requested",
  "status": "cancelling"
}
```

**Response (409) — No sync running:**
```json
{
  "message": "No running sync to cancel",
  "status": "idle"
}
```

---

### GET /api/sync-logs
Get recent sync history.

**Request:**
```http
GET /api/sync-logs?limit=10
```

**Query Parameters:**
- `limit` (integer, 1–100, default 10) — Number of logs to return

**Response (200):**
```json
[
  {
    "id": 5,
    "started_at": "2026-04-09T14:00:00Z",
    "finished_at": "2026-04-09T14:05:30Z",
    "status": "completed",
    "emails_fetched": 42,
    "emails_processed": 42,
    "apps_created": 2,
    "errors": []
  },
  {
    "id": 4,
    "started_at": "2026-04-09T02:00:00Z",
    "finished_at": "2026-04-09T02:03:15Z",
    "status": "completed",
    "emails_fetched": 15,
    "emails_processed": 15,
    "apps_created": 0,
    "errors": []
  }
]
```

**Use:** Frontend polls this to show sync progress and history.

---

## Stage Suggestion Endpoints

### GET /api/stage-suggestions
Get pending AI-suggested stage changes.

**Request:**
```http
GET /api/stage-suggestions
```

**Response (200):**
```json
[
  {
    "id": 1,
    "app_id": 42,
    "suggested_stage": "interview",
    "confidence": 0.88,
    "reasoning": "Email mentions 'interview scheduled for next week'",
    "created_at": "2026-04-09T14:00:00Z",
    "status": "pending"
  }
]
```

---

### PATCH /api/stage-suggestions/:id
Accept or dismiss a suggestion.

**Request:**
```http
PATCH /api/stage-suggestions/1
Content-Type: application/json

{
  "action": "confirm",
  "app_id": 42
}
```

**Fields:**
- `action` (confirm or dismiss) — required
- `app_id` (integer) — required for confirm, ignored for dismiss

**Response (200):**
```json
{
  "message": "Suggestion confirmed"
}
```

---

## Health Endpoints

### GET /health
Simple health check.

**Request:**
```http
GET /health
```

**Response (200):**
```json
{
  "status": "ok"
}
```

---

### GET /api/gemini/health
Check Gemini API health with a test classification.

**Request:**
```http
GET /api/gemini/health
```

**Response (200) — Healthy:**
```json
{
  "ok": true,
  "model": "gemini-2.5-flash",
  "result": {
    "email_type": "application_confirmation",
    "confidence": 0.98
  }
}
```

**Response (200) — Unhealthy:**
```json
{
  "ok": false,
  "model": "gemini-2.5-flash",
  "error": "Invalid API key or rate limit exceeded"
}
```

---

## Statistics Endpoints

### GET /api/stats
Get application statistics.

**Request:**
```http
GET /api/stats
```

**Response (200):**
```json
{
  "total_applications": 25,
  "by_status": {
    "submitted": 10,
    "more_info_required": 3,
    "interview": 8,
    "denied": 2,
    "offered": 2
  },
  "total_emails": 87,
  "pending_suggestions": 1
}
```

---

## Error Responses

All endpoints return errors in this format:

**400 Bad Request:**
```json
{
  "error": "Missing required fields: company_name, job_title"
}
```

**404 Not Found:**
```json
{
  "error": "Application not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```

---

## Rate Limiting

- **Gemini API:** 60 requests/minute (free tier)
- **MS Graph API:** 4000 requests/minute per app
- **Backend:** No built-in rate limiting (localhost only)

---

## Changelog

### Latest Changes
- Added `VITE_API_BASE` for configurable API endpoint
- Added sync progress updates with `emails_fetched` tracking
- Added `cancelled` status to sync logs
- Added `/api/gemini/health` endpoint

See [AGENT_LOG.md](../AGENT_LOG.md) for full development history.

