#!/bin/bash
set -e

echo "=== PRE-TASK STATE CHECK ==="
echo ""
echo "--- Recent Commits (10 latest) ---"
git log --oneline -10 2>/dev/null || echo "No git history"
echo ""
echo "--- Working Tree Status ---"
git status --short 2>/dev/null || echo "Not a git repo"
echo ""
echo "--- Open Codex Branches ---"
CODEX_BRANCHES=$(git branch -a 2>/dev/null | grep "codex/" || echo "None")
echo "$CODEX_BRANCHES"
echo ""
echo "--- Last 5 Agent Log Entries ---"
if [ -f AGENT_LOG.md ]; then
    tail -5 AGENT_LOG.md
else
    echo "No agent log yet"
fi
echo ""

# WARN if unmerged Codex work exists
if git branch -a 2>/dev/null | grep -q "codex/"; then
    echo "⚠️  WARNING: Unmerged Codex branches detected."
    echo "   PM should review these branches before Dev continues."
    echo ""
fi

echo "=== END PRE-TASK STATE CHECK ==="
