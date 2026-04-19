# →PIPELINE

> A job application tracker with multi-user support, interview prep tools, and markdown-based research. Built with Firebase for cloud storage and Google sign-in.

**☁️ Cloud-hosted on Firebase. Secure, multi-user, zero server management.**

![Firebase](https://img.shields.io/badge/firebase-hosted-orange) ![React](https://img.shields.io/badge/react-18+-cyan) ![Google Auth](https://img.shields.io/badge/auth-google-blue)

---

## ✨ Features

- 🎯 **Pipeline Tracking** — Five-stage kanban: Submitted → Phone Screening → 1st Round → 2nd Round → 3rd Round
- 👤 **Multi-User Profiles** — Sign in with Google; separate dashboards per user
- 📝 **Interview Prep** — Upload markdown research notes; auto-parsed and saved
- 🎓 **Interview Questions** — Generate practice questions from research
- 🎨 **3D Card Design** — Responsive cards with hover details (target salary, location)
- 🔐 **Secure & Private** — Firebase Firestore with row-level security; only your data visible
- ⚡ **Real-Time Sync** — Changes sync instantly across devices

## 🛠 Tech Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| **Frontend** | React 18 + Vite | Fast, reactive UI |
| **Auth** | Firebase Authentication | Google sign-in only |
| **Database** | Firestore (Firebase) | Realtime, serverless |
| **Hosting** | Firebase Hosting | Global CDN, HTTPS |
| **UI Framework** | shadcn/ui + Tailwind CSS | Beautiful, accessible components |
| **State** | React Hooks + Context | Auth state, user data |

---

## 🚀 Live Demo

**→PIPELINE is live at:** [job-app-crm.firebaseapp.com](https://job-app-crm.firebaseapp.com)

Just sign in with your Google account—no setup needed!

## 🏠 Local Development

### Prerequisites
- Node.js 16+
- npm 8+
- Google account (for sign-in testing)

### Setup

```bash
# Clone repo
git clone https://github.com/NateButlerExplains/JobAppCRM.git
cd JobAppCRM

# Install dependencies
cd frontend
npm install
cd ..

# Start dev server
cd frontend
npm run dev
```

Then **open http://localhost:5173 in your browser**.

### Environment Variables

The Firebase config is already in `frontend/src/firebase.js`. No `.env` needed for local dev—sign-in will work.

## 📖 How to Use

### 1. Sign In
Click **"Sign in with Google"** on the login page. You'll be asked to authenticate once.

### 2. Dashboard (Kanban Board)
- Drag cards between 5 columns (Submitted → Phone Screening → ... → 3rd Round)
- Click a card to see details (company, role, applied date, target salary)
- Hover to reveal: location, work arrangement, interview prep button
- Click **+ New** to add a new application

### 3. Application Details
Click a card to open the detail panel:
- **Company & Role** — centered, high contrast
- **Applied Date & Status** — timestamp and current stage
- **Salary Range** — min-max and negotiation target
- **Interview Prep Button** — jump to prep for this application

### 4. Interview Prep
Go to **Interview Prep** tab to:
- Upload a `.md` file with company research (format: markdown)
- Research is auto-parsed and displayed
- Generate interview questions from your research
- Track multiple applications' prep side-by-side

### 5. Settings
**Coming soon** — currently a placeholder

## 🗂 Data Structure (Firestore)

```
users/{userId}/
  ├── applications/{appId}
  │   ├── company_name: string
  │   ├── job_title: string
  │   ├── status: enum (Submitted, Phone Screening, 1st Round, 2nd Round, 3rd Round, Archived)
  │   ├── date_submitted: date
  │   ├── salary_min, salary_max, salary_negotiation_target: number
  │   ├── job_location, work_arrangement: string
  │   └── ...
  │
  ├── interviewPrep/{appId}
  │   ├── company_research: text (markdown)
  │   ├── interview_questions: array of strings
  │   └── updated_at: timestamp
  │
  └── settings/ (future)
```

Each user only sees their own data—enforced by Firestore security rules.

## 🔒 Security

- **Google Sign-In Only** — No passwords, no email/password attacks
- **Row-Level Security** — Firestore rules ensure users only access their own data
- **HTTPS** — All traffic encrypted (Firebase Hosting)
- **No Backend** — Data stored directly in Firestore; no custom server to attack

## 🚢 Deployment

### Frontend to Firebase Hosting

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

Or trigger automatic deployment:
1. Push to `main` branch on GitHub
2. GitHub Actions runs `npm run build`
3. Firebase Hosting auto-deploys the `dist/` folder

### Environment Variables (Production)

No backend to configure. Firebase config is in the code. Sign-in works globally.

## 🧪 Testing

### Manual Testing Checklist

- [ ] Sign in with Google
- [ ] Create a new application
- [ ] Drag card between columns
- [ ] Click card to view details
- [ ] Hover card to see extra info
- [ ] Upload `.md` file to Interview Prep
- [ ] Generate interview questions
- [ ] Delete an interview prep session
- [ ] Sign out and back in—your data persists
- [ ] Open on different browser/device—data syncs

### Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📁 File Structure

```
JobAppCRM/
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Main app + routes
│   │   ├── AuthContext.jsx            # Google auth + user state
│   │   ├── Login.jsx                  # Sign-in page
│   │   ├── firebase.js                # Firebase config
│   │   ├── KanbanBoard.jsx            # Drag-and-drop board
│   │   ├── ApplicationCard.jsx        # Card with 3D styling
│   │   ├── CardDetail.jsx             # Detail panel
│   │   ├── InterviewPrepPage.jsx      # Research + questions
│   │   ├── InterviewPrepHistory.jsx   # Prep sessions list
│   │   ├── Settings.jsx               # Settings (placeholder)
│   │   ├── NewApplicationForm.jsx     # Create app modal
│   │   ├── PromptTemplateModal.jsx    # Research prompt editor
│   │   ├── api.js                     # API client (legacy)
│   │   └── index.css                  # Tailwind + custom styles
│   ├── public/
│   │   └── favicon.svg                # Pipeline icon
│   ├── vite.config.js                 # Vite config
│   ├── tailwind.config.js             # Tailwind setup
│   ├── package.json                   # Dependencies
│   └── index.html                     # Entry point
│
├── .github/workflows/                 # CI/CD (if needed)
├── CLAUDE.md                          # Dev architecture
├── DEPLOYMENT.md                      # Deploy guides
├── README.md                          # This file
└── .gitignore
```

## 🔧 Troubleshooting

### Sign-in Not Working
- Clear browser cookies/cache
- Ensure you have a Google account
- Check Firebase console → Authentication → Google provider enabled

### Data Not Persisting
- Ensure you're signed in (check browser Storage → Application → Firebase)
- Check Firebase console → Firestore → see if documents are being created
- Check browser console for errors (F12 → Console tab)

### Cards Not Dragging
- Ensure JavaScript is enabled
- Try a different browser
- Clear cache and reload

### Interview Prep Upload Failed
- Ensure `.md` file is valid markdown
- Check file is under 1MB
- See browser console for error details

## 🛣 Roadmap

- [ ] Email sync integration (Microsoft Graph API)
- [ ] Auto-classification of emails (Claude AI)
- [ ] Stage suggestions based on interactions
- [ ] Settings page (themes, notifications)
- [ ] Export to CSV
- [ ] Mobile app (React Native)

## 📝 Contributing

This is a personal project with an autonomous agent dev workflow. See [CLAUDE.md](CLAUDE.md) for architecture.

To contribute:
1. Fork the repo
2. Create a feature branch
3. Make changes
4. Submit a pull request

## 📧 Support

For issues, check the Troubleshooting section above or open a GitHub Issue.

---

**Built with ❤️ for job searchers.**

Deploy to Firebase Hosting: `firebase deploy`  
Start local dev: `cd frontend && npm run dev`
