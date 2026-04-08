#!/bin/bash
set -e

TASK_DESC="$1"
if [ -z "$TASK_DESC" ]; then
    echo "Usage: ./scripts/codex-task.sh \"task description\""
    echo ""
    echo "Example: ./scripts/codex-task.sh \"add loading spinners to all API calls\""
    exit 1
fi

# Create branch slug from task description
SLUG=$(echo "$TASK_DESC" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | cut -c1-40)
BRANCH="codex/$SLUG"

echo "=== CODEX CONTRACTOR INVOCATION ==="
echo "Task: $TASK_DESC"
echo "Branch: $BRANCH"
echo ""

# 1. Create and switch to Codex branch
echo "Creating and switching to branch: $BRANCH"
git checkout -b "$BRANCH" 2>/dev/null || (git fetch origin && git checkout -b "$BRANCH")
echo "✅ Branch created"
echo ""

# 2. Generate CONTRACTOR_BRIEF.md
echo "Generating CONTRACTOR_BRIEF.md..."
cat > CONTRACTOR_BRIEF.md << BRIEF
# Contractor Brief — Job Application CRM
Generated: $(date -u +"%Y-%m-%d %H:%M UTC")

## Your Task
$TASK_DESC

## Working Branch
You are on branch: $BRANCH
**DO NOT commit to main or any other branch.**

## Project Overview
See CLAUDE.md for complete project details. Quick summary:
- Backend: Python 3.11 + Flask + SQLite
- Frontend: React + Vite + shadcn/ui + Tailwind
- Email: MS Graph API (Outlook)
- AI: Google Gemini API for classification

## Files Recently Modified by Other Agents
$([ -f AGENT_LOG.md ] && tail -10 AGENT_LOG.md || echo "No recent agent activity")

## Bounds & Restrictions
- Work ONLY on branch: $BRANCH
- DO NOT modify these files:
  - CLAUDE.md
  - CONTRACTOR_BRIEF.md
  - AGENT_LOG.md
  - .claude/ directory
  - orchestrator/ (if it exists)
  - setup.sh / .env / .gitignore
- DO NOT commit to main or push to origin
- Commit your changes to $BRANCH when done

## Acceptance Criteria
When you're finished:
1. All changes committed to $BRANCH
2. Code is clean and follows the project style
3. Tests pass (if applicable)
4. Git commit message clearly describes the work

## What Happens Next
1. You finish and commit your work to $BRANCH
2. Switch back to main: \`git checkout main\`
3. The PM agent will review your $BRANCH
4. CEO will approve or request changes
5. PM will merge into main

## Questions?
See CLAUDE.md for the full project context, architecture, and contact procedure.
BRIEF

echo "✅ CONTRACTOR_BRIEF.md generated"
echo ""

# 3. Log the invocation in AGENT_LOG.md
echo "[$(date -u +"%Y-%m-%d %H:%M")] CODEX started  | branch: $BRANCH | task: $TASK_DESC" >> AGENT_LOG.md
echo "✅ Logged to AGENT_LOG.md"
echo ""

# 4. Instructions for the user
echo "=== NEXT STEPS ==="
echo ""
echo "Branch '$BRANCH' is ready."
echo "CONTRACTOR_BRIEF.md has been generated."
echo ""
echo "Now run Codex CLI with your task:"
echo "  codex \"$TASK_DESC\""
echo ""
echo "When you're done with your changes, commit them:"
echo "  git add -A && git commit -m \"codex: $TASK_DESC\""
echo ""
echo "Switch back to main:"
echo "  git checkout main"
echo ""
echo "Then ask the PM agent to review your work:"
echo "  /pm review the $BRANCH branch"
echo ""
echo "=== CODEX READY ==="
