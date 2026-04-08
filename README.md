# Job Application CRM

> A personal, fully local job application tracking system that automatically syncs emails from Outlook, classifies them with AI, and suggests pipeline stage changes.

**⚡ No external hosting required. Everything runs on your machine.**

![GitHub](https://img.shields.io/badge/repo-private-lightgrey) ![Python](https://img.shields.io/badge/python-3.11+-blue) ![React](https://img.shields.io/badge/react-18+-cyan) ![SQLite](https://img.shields.io/badge/sqlite-WAL-green)

---

## ✨ Features

- 📧 **Auto-linking Emails** — Syncs emails from Outlook (via Microsoft Graph API) and intelligently links them to job applications using domain matching, keyword detection, and AI classification
- 🤖 **AI Classification** — Uses Google Gemini to classify emails: application confirmations, interview requests, rejections, offers, and more
- 🎯 **Pipeline Tracking** — Drag-and-drop kanban board with five stages: Submitted → More Info Required → Interview Started → Denied / Offered
- 💡 **Smart Suggestions** — AI recommends stage changes when relevant emails arrive (e.g., "move to Interview Started" when interview request detected)
- 🔄 **Flexible Syncing** — Automatic daily 2 AM sync + on-demand manual sync with progress tracking and ETA
- 📊 **Unlinked Tray** — Searchable panel for emails that don't auto-match, with easy manual linking to applications
- 🔐 **Fully Private** — All data stays on your machine; no cloud dependencies beyond free-tier APIs
- 📈 **Operational Control** — Monitor sync health, cancel in-progress syncs, view detailed sync history

## 🛠 Tech Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Backend** | Python 3.11 + Flask | RESTful API, async email sync |
| **Database** | SQLite with WAL mode | Concurrent access, no external DB needed |
| **Frontend** | React 18 + Vite | Fast dev experience, optimized builds |
| **UI Framework** | shadcn/ui + Tailwind CSS | Beautiful, accessible components |
| **Email** | Microsoft Graph API | OAuth2 device code flow, personal accounts |
| **AI** | Google Gemini (free tier) | Email classification & suggestions |
| **Scheduler** | APScheduler | Background jobs, configurable schedule |
| **Containerization** | Docker + docker-compose | Optional: deploy anywhere |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 16+
- npm 8+

### Automatic Setup (Recommended)
```bash
./setup.sh
```

This will:
1. Check for required software
2. Create `.env` file
3. Set up Python virtual environment and install dependencies
4. Initialize SQLite database
5. Install Node.js dependencies
6. Guide you through API key setup

### Manual Setup

```bash
# Create environment file
cp .env.example .env

# Python setup
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# or: venv\Scripts\activate  # Windows
pip install -r backend/requirements.txt
python3 backend/models.py  # Initialize database

# Node setup
cd frontend
npm install
cd ..

# Create logs directory
mkdir -p logs
```

## Getting API Keys

### 1. Microsoft Graph API (for Outlook)

Personal Microsoft Accounts (outlook.com, hotmail.com) require OAuth2 device code flow.

**Steps:**
1. Go to [Azure Portal](https://portal.azure.com) (create free account if needed)
2. Navigate to **Azure Active Directory** → **App registrations** → **+ New registration**
3. Name: `Job CRM` (or similar)
4. Under "Supported account types", select: **Accounts in any organizational directory and personal Microsoft accounts**
5. Leave Redirect URI blank for now (device flow doesn't use it)
6. Click **Register**
7. Go to **Certificates & secrets** → **+ New client secret**
   - Description: `Job CRM local`
   - Expiration: 24 months (or your preference)
   - Copy the **Client ID** from the Overview page
   - Copy the **Client Secret** value (not the Secret ID)
8. Go to **API Permissions** → **Add a permission**
   - Select **Microsoft Graph** → **Delegated permissions**
   - Search for and check `Mail.Read`
   - Click **Add permissions**
9. Add to `.env`:
   ```
   MS_GRAPH_CLIENT_ID=your_client_id
   MS_GRAPH_CLIENT_SECRET=your_client_secret
   MS_GRAPH_USERNAME=your_outlook_email@outlook.com
   MS_GRAPH_PASSWORD=your_outlook_password
   ```

> ⚠️ **Security note:** These credentials are for local use only. Never commit `.env` to version control. Add `.env` to `.gitignore` (already done).

### 2. Google Gemini API (for AI classification)

**Steps:**
1. Go to [ai.google.dev](https://ai.google.dev)
2. Click "Get API Key"
3. Create a new API key
4. Copy it and add to `.env`:
   ```
   GEMINI_API_KEY=your_api_key
   ```

## Running the App

### Terminal 1 (Backend - port 5000)
```bash
source venv/bin/activate  # Activate virtual environment
cd backend
python app.py
```

You should see:
```
Running on http://127.0.0.1:5000
APScheduler initialized with daily 2 AM sync job
```

### Terminal 2 (Frontend - port 3000)
```bash
cd frontend
npm run dev
```

You should see:
```
VITE v5.4.21  ready in xxx ms

➜  Local:   http://localhost:3000/
```

Then **open http://localhost:3000 in your browser**.

## How It Works

### Kanban Board (Dashboard)

The main view shows your applications in a 5-column kanban:
- **Submitted** — Applications you've just sent
- **More Info Required** — Waiting on additional info from you
- **Interview Started** — In active interview process
- **Denied** — Rejection received
- **Offered** — Offer received

**Drag and drop** cards between columns to update status. Changes sync to the backend immediately.

### Email Syncing

**Daily at 2 AM (or manually via Settings → Run Sync Now):**
1. Fetch last 7 days of emails from your Outlook inbox
2. For each email, classify with Gemini AI
3. Link to applications based on:
   - **Domain match** (0.9 confidence) — email domain matches company domain
   - **Keyword match** (0.7 confidence) — company name or keywords in subject/body
   - **Semantic match** (variable) — AI-powered similarity
4. Ambiguous matches go to **Unlinked Emails Tray** for manual linking

### Unlinked Emails Tray

At the bottom of the dashboard, you'll see unlinked emails. Click to search for an application and assign the email. The email will then appear in the application's detail panel.

### Application Details

Click any card to open the detail panel. You'll see:
- **Emails tab** — All emails linked to this application
- **Interactions tab** — Phone calls, texts, notes (chronologically ordered)
- **Add Note tab** — Record interactions (calls, texts, manual notes)

## Architecture

The system uses a **three-role multi-agent architecture** for maintenance and development. See [CLAUDE.md](CLAUDE.md) for details on:
- **PM Mode** — Project management and health reviews
- **Dev Mode** — Autonomous task execution
- **CEO Mode** — Strategic decisions and oversight

## Database Schema

6 tables (SQLite with WAL mode for concurrent access):
- **applications** — Job applications with status
- **emails** — Synced emails with classification and linking
- **interactions** — Phone calls, texts, manual notes
- **stage_suggestions** — AI suggestions for status changes
- **processed_emails** — Dedup tracking (prevent re-processing)
- **sync_logs** — History of sync runs

See `backend/models.py` for the full schema.

## 🔧 Troubleshooting

### Setup Issues

#### "No module named 'models'" or Import errors
**Solution:** Ensure virtual environment is activated and dependencies are installed.
```bash
source venv/bin/activate  # or: venv\Scripts\activate on Windows
pip install -r backend/requirements.txt
python3 -c "import models" # Test import
```

#### "Connection refused" (can't reach localhost:5000 or 3000)
**Cause:** Port is already in use or service didn't start.
```bash
# Check what's using the port
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Either kill the process or use a different port
FLASK_PORT=5001 python backend/app.py
```

#### "ModuleNotFoundError: No module named 'flask'" or other dependency errors
**Solution:** Reinstall dependencies:
```bash
pip install --upgrade pip
pip install -r backend/requirements.txt
```

### Authentication Issues

#### "Device code verification failed" or "Invalid client"
**Causes & solutions:**
1. Client ID/Secret mismatch → Double-check `.env` against Azure Portal
2. App not marked as public client → In Azure: **Manifest** → change `"allowPublicClient": true`
3. Redirect URI mismatch → Device flow doesn't require redirect URI; if you set one, it can conflict
4. Account type wrong → Ensure app registration allows **personal Microsoft accounts**

**Debug:** Check logs in the Settings page → "Gemini Health" panel. Click to verify API keys are valid.

#### "AADSTS70002: Client not marked as mobile/public"
**Solution:** In Azure Portal, go to **Manifest** and set:
```json
"allowPublicClient": true,
"isFallbackPublicClient": true
```

### Email Sync Issues

#### "No emails synced" or "0 emails fetched"
**Checklist:**
1. Outlook account is connected → Settings page should show green indicator
2. Device code flow completed → Allowed the app in Microsoft's device login screen
3. MS_GRAPH_CLIENT_ID is correct → Compare with Azure Portal
4. Email exists in Outlook inbox from the last 30 days (configurable via `EMAIL_SYNC_DAYS_BACK`)

**Debug:** Check backend logs for "Fetched 0 emails" messages.

#### "Pagination errors" or duplicate emails
**Solution:** This is fixed in latest version. If you see pagination errors:
```bash
git pull origin main
```

#### "Rate limit exceeded" on Gemini API
**Cause:** Free tier limit is ~60 requests/minute.
**Solution:**
- Wait 5 minutes before next sync
- Add billing to your Google account for higher limits
- Configure sync frequency in Settings

### Database Issues

#### "Database is locked" or SQLite corruption
**Solution:** Reset the database by removing WAL files:
```bash
rm jobs.db jobs.db-wal jobs.db-shm
python3 backend/models.py  # Recreate empty DB
```

#### "Disk I/O error"
**Cause:** SQLite DB might be on a network drive with latency.
**Solution:** Move DB to local drive:
```bash
# In .env
DATABASE_PATH=./jobs.db  # Ensure it's a local path, not /mnt or SMB share
```

### Frontend Issues

#### CSS not loading or components unstyled
**Solution:** Vite dev server not running or build assets corrupted:
```bash
cd frontend
npm run dev  # Restart dev server
# or for production build:
npm run build
npm run preview
```

#### "Cannot POST /api/..." (API calls failing)
**Debug:** Check that backend is running on the correct port:
```bash
curl http://localhost:5001/health  # Backend healthcheck
```
If fails, restart backend. Check VITE_API_BASE in frontend/.env matches backend port.

### Performance Issues

#### "Sync is very slow" (processing 100+ emails takes >10 min)
**Profile & optimize:**
1. Check Gemini health → Settings → "Gemini Health" button
2. Monitor Gemini rate limit → Check logs for "rate limit" messages
3. Reduce sync frequency → Settings → Configure auto-sync schedule
4. Profile with 100 emails first → `EMAIL_SYNC_DAYS_BACK=1` in `.env`

**Expected:** ~1–2 emails per second (varies with Gemini latency)

#### Frontend Kanban sluggish with 500+ applications
**Solution:** Feature coming in Phase 5 (task virtualization). For now:
- Archive old applications or split into separate CRM instances
- Use search/filter to reduce visible cards

## File Structure

```
JobAppCRM/
├── backend/
│   ├── app.py                 # Flask API + scheduler
│   ├── models.py              # SQLite schema + ORM methods
│   ├── auth.py                # Microsoft OAuth2 PKCE
│   ├── email_processor.py     # Email fetch/sync pipeline
│   ├── gemini_classifier.py   # Email classification
│   ├── application_linker.py  # Email-to-app matching
│   ├── config.py              # Configuration + logging
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main app + routing
│   │   ├── KanbanBoard.jsx    # Drag-and-drop board
│   │   ├── ApplicationCard.jsx # Card component
│   │   ├── CardDetail.jsx     # Detail panel
│   │   ├── AddInteraction.jsx # Add interaction modal
│   │   ├── NewApplicationForm.jsx # New app form
│   │   ├── UnlinkedEmailsTray.jsx # Unlinked emails panel
│   │   ├── Settings.jsx       # Sync management
│   │   └── api.js             # API client
│   └── package.json           # Node dependencies
├── tests/                     # Backend test suite
├── setup.sh                   # One-command setup
├── CLAUDE.md                  # Dev team documentation
└── README.md                  # This file
```

## Performance Notes

- **SQLite WAL mode** enables concurrent reads while writes happen
- **Rate limiter** (1 req/sec) on Gemini API to stay within free tier
- **Optimistic UI updates** in kanban for instant feedback
- **Automatic revert** if network errors occur

## Contributing

This project uses an **autonomous agent architecture** for development:

1. **PM Review** — Check project health and recommend work
   ```bash
   /pm review current state
   ```

2. **Dev Execution** — Work on specific tasks autonomously
   ```bash
   /dev TASK-001
   ```

3. **CEO Approval** — Make strategic decisions and approve work

See [CLAUDE.md](CLAUDE.md) for the full role structure and workflow.

## License

Personal project — use as you like.

## Support

Check the Troubleshooting section above, or review the console logs in `logs/` directory.

---

**Happy job hunting!** 🚀
