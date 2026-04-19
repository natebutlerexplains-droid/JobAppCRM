# →PIPELINE Deployment Guide

## Frontend — Vercel

1. **Connect your GitHub repo to Vercel**
   - Go to https://vercel.com/new
   - Select your JobAppCRM repository
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

2. **Set Environment Variables in Vercel**
   ```
   VITE_API_BASE=https://your-backend-url/api
   ```

3. **Deploy**
   - Vercel automatically deploys on every push to `main`
   - Custom domain support included

---

## Backend — Railway

1. **Connect to Railway**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub"
   - Choose JobAppCRM repo
   - Select `backend` as the root directory

2. **Configure Environment Variables**
   ```
   FLASK_PORT=5000
   FLASK_ENV=production
   USE_POSTGRES=true
   SUPABASE_CONNECTION_STRING=postgresql://...
   CLAUDE_API_KEY=sk-...
   ```

3. **Add PostgreSQL Plugin**
   - In Railway, add Postgres service
   - Link to your app
   - Use Supabase connection string instead (or Railway's Postgres)

4. **Deploy**
   - Railway auto-deploys on `main` push
   - Get your backend URL (e.g., `https://jobappcrm-prod.railway.app`)
   - Update frontend `VITE_API_BASE` to this URL

---

## Data Backup

All production data lives in **Supabase PostgreSQL**:
- Free tier: 500MB storage, 1GB egress/month
- Automatic backups
- Connection string in `backend/supabase_config.py`

Local SQLite falls back if Supabase is unreachable (offline mode).

---

## Health Checks

**Frontend** (Vercel):
- Automatic preview deployments on PRs
- One-click rollbacks

**Backend** (Railway):
- Monitor logs: `railway logs`
- Health endpoint: `GET /api/applications` should return 200
- Scheduler runs daily at 2 AM UTC

---

## Post-Deployment

1. Test both services are talking:
   ```
   curl https://your-vercel-url
   curl https://your-railway-url/api/applications
   ```

2. Monitor Supabase:
   - Check storage usage: https://app.supabase.com
   - Set up email alerts for quota warnings

3. Update CORS if needed:
   - Add Vercel domain to `backend/app.py` CORS origins
