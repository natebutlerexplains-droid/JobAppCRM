# Contributing to Job Application CRM

Thank you for your interest in contributing! This document explains the project structure, development workflow, and how to add features safely.

## 📋 Project Overview

**Job Application CRM** uses a **three-role autonomous agent architecture** for development and maintenance:

- **CEO (You)** — Strategic decisions, project approval, escalations
- **PM (Claude in PM mode)** — Health reviews, task planning, quality checks
- **Dev (Claude or Codex)** — Autonomous task execution, testing, reporting

All work is tracked via a **task queue** (`.claude/tasks/queue.md`) with sequential numbering (TASK-001, TASK-002, etc.).

See [CLAUDE.md](CLAUDE.md) for the full governance model.

---

## 🚀 Getting Started

### Before You Start Working

Read these files **in order** (takes 15 minutes):
1. [CLAUDE.md](CLAUDE.md) — Project architecture and three-role structure
2. [.claude/tasks/queue.md](.claude/tasks/queue.md) — Active task registry with specs
3. [AGENT_LOG.md](AGENT_LOG.md) — Recent work (what was just completed)

### Claim a Task

**Every piece of work must have a task ID.** Before you write any code:

1. Open `.claude/tasks/queue.md`
2. Look for a task with `status: queued`
3. Assign yourself and mark it `in-progress`
4. Update `.claude/tasks/queue.md` with your start time in a new log entry

**Example:** If you're starting TASK-012 (backend tests):
```markdown
### TASK-012: Comprehensive test suite for backend
- **Status:** in-progress
- **Assigned to:** You
- **Started:** 2026-04-09 10:30
```

Then append to [AGENT_LOG.md](AGENT_LOG.md):
```
[2026-04-09 10:30] YOU-TYPE starting | task: TASK-012 | backend tests
```

---

## 📝 Code Standards

### Python (Backend)

**Style:**
- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/)
- Use type hints where possible
- Max line length: 100 characters
- Use meaningful variable names

**Example:**
```python
def classify_email(subject: str, body: str, sender: str) -> Dict[str, Any]:
    """Classify an email using Gemini API.
    
    Args:
        subject: Email subject line
        body: Email body text
        sender: Sender email address
    
    Returns:
        Dict with keys: email_type, confidence, reasoning
    """
    # Implementation
```

**Testing:**
- Write tests for new functions
- Use pytest for test discovery
- Mock external APIs (MS Graph, Gemini)
- Aim for >80% code coverage

**Linting:**
```bash
pip install flake8 black
black backend/ --line-length 100
flake8 backend/
```

### JavaScript/React (Frontend)

**Style:**
- Use functional components + hooks
- Use camelCase for variables, PascalCase for components
- Add JSDoc comments for complex logic
- Max line length: 100 characters

**Example:**
```javascript
/**
 * Kanban card component for a job application
 * @param {Object} application - Application object with id, company, status
 * @param {Function} onStatusChange - Callback when card is dropped
 */
export function ApplicationCard({ application, onStatusChange }) {
  // Implementation
}
```

**Testing:**
- Use Vitest + React Testing Library
- Test user interactions, not implementation
- Mock API calls with axios mock
- Aim for >70% component coverage

**Linting:**
```bash
npm install --save-dev eslint prettier
npx prettier --write frontend/src/
npx eslint frontend/src/ --fix
```

---

## 🔄 Development Workflow

### 1. Local Setup

```bash
# Clone repo and set up
git clone <repo-url>
cd JobAppCRM
./setup.sh  # Or manual setup per README

# Create a feature branch (optional, for longer tasks)
git checkout -b feature/TASK-NNN-description
```

### 2. Work on Your Task

**During implementation:**
- Run tests frequently (`pytest tests/` or `npm run test`)
- Commit often with clear messages: `TASK-001: add Email.get_by_id method`
- Stay within task scope (don't expand beyond acceptance criteria)

**If you hit a blocker:**
1. Document it clearly in `.claude/tasks/queue.md` as a note
2. Don't work around it — escalate to PM/CEO

### 3. Test Before Committing

**Backend:**
```bash
# Run all tests
pytest tests/ -v --cov=backend --cov-report=term-missing

# Lint
flake8 backend/
black backend/
```

**Frontend:**
```bash
# Run tests
npm run test

# Lint
npm run lint
npm run format
```

### 4. Commit and Report

**Commit message format:**
```
TASK-NNN: brief description of what was done

- Bullet point details if multi-part
- Another detail
```

**Example:**
```
TASK-001: Add Email.get_by_id() method and fix test isolation

- Add Email.get_by_id(db, id) to models.py
- Fix conftest.py fixture to use correct method name
- Run full test suite: 18/18 passed
- Coverage: 87% (up from 72%)
```

**After finishing, update task status:**
```markdown
### TASK-001: Fix known backend bugs
- **Status:** completed
- **Completed by:** You
- **Date:** 2026-04-09
- **Summary:** All 4 bugs fixed, tests passing
- **Files:** backend/models.py, tests/conftest.py
```

Then append to [AGENT_LOG.md](AGENT_LOG.md):
```
[2026-04-09 11:45] YOU-TYPE finished | task: TASK-012 | files: backend/test_models.py, backend/test_api.py, backend/test_auth.py | status: COMPLETE | coverage: 82%
```

---

## 🧪 Testing Guidelines

### Backend Tests

Use `pytest` with fixtures in `tests/conftest.py`:

```python
# tests/test_models.py
import pytest
from models import Database, Application

def test_application_create(db):
    """Test creating a new application."""
    app_id = Application.create(
        db,
        company_name="Google",
        job_title="Software Engineer",
        date_submitted="2026-04-09"
    )
    assert app_id > 0
    app = Application.get_by_id(db, app_id)
    assert app["company_name"] == "Google"
```

**Best practices:**
- Use `db` fixture (in-memory SQLite)
- Test both happy path and error cases
- Mock external APIs (don't call real Gemini or MS Graph)
- Clean up: fixtures auto-cleanup

### Frontend Tests

Use Vitest + React Testing Library:

```javascript
// frontend/src/KanbanBoard.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import { KanbanBoard } from './KanbanBoard'

describe('KanbanBoard', () => {
  it('renders columns', () => {
    render(<KanbanBoard applications={[]} />)
    expect(screen.getByText('Submitted')).toBeInTheDocument()
  })

  it('drops card to new column', async () => {
    const onStatusChange = vi.fn()
    render(
      <KanbanBoard 
        applications={[{ id: 1, company: 'Google', status: 'submitted' }]}
        onStatusChange={onStatusChange}
      />
    )
    // Simulate drag-and-drop
    fireEvent.drop(/* ... */)
    expect(onStatusChange).toHaveBeenCalled()
  })
})
```

**Best practices:**
- Test user behavior, not implementation
- Mock API calls with `vi.mock('axios')`
- Use semantic queries (`getByRole`, `getByLabelText`)
- Async tests: use `waitFor` for API responses

---

## 🐛 Bug Reports

When you find a bug:

1. **Create a task spec:**
   - Describe steps to reproduce
   - Expected vs actual behavior
   - Include error logs if available

2. **Update task queue:**
   ```markdown
   ### TASK-NNN: [Bug] Sync pagination broken
   - **Status:** queued
   - **Priority:** high
   - **Spec:**
     - Fetch 1000+ emails
     - Observe: Only 50 emails synced
     - Expected: All emails fetched
     - Root cause: @odata.nextLink not followed (pagination broken)
   ```

3. **Escalate to PM** if blocking other work

---

## 📚 Documentation Standards

### README Updates
- Keep setup instructions current
- Document new features in "Features" section
- Add troubleshooting for new error cases
- Include examples

### In-Code Comments
- Comment *why*, not *what*
- Bad: `# Loop through emails`
- Good: `# Deduplicate by message-id to avoid re-processing same email`

### Commit Messages
- Use imperative mood: "Add feature" not "Added feature"
- First line: <50 characters, summarize change
- Body: Explain *why* if non-obvious

---

## 🔐 Security Checklist

Before committing:

- [ ] No secrets in code (API keys, passwords, tokens)
- [ ] `.env` is in `.gitignore`
- [ ] No hardcoded URLs (use config)
- [ ] SQL queries parameterized (use `?` placeholders)
- [ ] User input validated (length, type, format)
- [ ] CORS only allows localhost in dev

**If you add a new secret:**
```bash
# Add to .env.example (with placeholder)
# Document in README how to get the real key
# Never commit actual values
```

---

## 🚀 Deploying Changes

Once your task is complete and tested:

1. **PM reviews** your work (compares against task spec)
2. **Tests pass** (backend: >80% coverage, frontend: >70%)
3. **Code is clean** (linted, formatted, no console warnings)
4. **Task marked complete** in `.claude/tasks/queue.md`
5. **Commit pushed to `main`** (no feature branches kept)

---

## 📞 Getting Help

### If you're blocked:

1. **Check docs first:** [CLAUDE.md](CLAUDE.md), [README.md](README.md), [AGENT_LOG.md](AGENT_LOG.md)
2. **Check git history:** `git log --grep="similar-keyword"` to find related fixes
3. **Document and escalate:** Add blocker note to task queue, notify PM

### For questions about architecture:

- See [CLAUDE.md](CLAUDE.md) "Architectural Decisions" section
- Check `.claude/decisions/log.md` for design trade-offs
- Read relevant PR descriptions in git history

---

## 🎯 Task Types

### Bug Fix (e.g., TASK-001)
- Reproduce issue
- Identify root cause
- Write failing test
- Fix code
- Verify test passes
- Regression test for future

### Feature (e.g., TASK-012)
- Write tests first (TDD optional but encouraged)
- Implement feature
- Test edge cases
- Update docs
- Verify acceptance criteria

### Refactor (e.g., future)
- Don't change behavior
- Improve code structure/readability
- All tests must still pass
- Update docs if interface changes
- No scope creep

---

## 🎓 Learning Resources

### For this project:
- [CLAUDE.md](CLAUDE.md) — Full governance and architecture
- [.claude/tasks/queue.md](.claude/tasks/queue.md) — Current/past tasks as examples
- [AGENT_LOG.md](AGENT_LOG.md) — What was just done (great for context)

### Python/Flask:
- [Flask Quickstart](https://flask.palletsprojects.com/en/latest/quickstart/)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/en/20/) (for reference; we use raw SQL)
- [APScheduler Docs](https://apscheduler.readthedocs.io/)

### React/Frontend:
- [React Hooks](https://react.dev/reference/react)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)

### Testing:
- [pytest Documentation](https://docs.pytest.org/)
- [Vitest Guide](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

---

## Thank You!

Your contributions help make this project better. Questions? Open an issue or check [CLAUDE.md](CLAUDE.md) for contact info.

