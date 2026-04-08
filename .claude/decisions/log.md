# Decision Log

Record of all major project decisions made by the CEO, PM, or Dev agents. Each decision includes rationale and approval status.

---

## Decision Framework

| Field | Meaning |
|-------|---------|
| **ID** | Decision identifier (DECISION-NNN) |
| **Date** | When proposed |
| **Proposed By** | CEO, PM, Dev, or Codex |
| **Title** | Short decision name |
| **Context** | Why this decision is needed |
| **Options Considered** | Alternatives explored |
| **Decision** | What was chosen |
| **Approved By** | CEO sign-off |
| **Rationale** | Why this was the best choice |

---

## DECISION-001: Multi-Agent Architecture
- **Date:** 2026-04-08
- **Proposed By:** CEO
- **Title:** Adopt lightweight role-based architecture (PM + Dev separation)
- **Context:** Need quality gates, code review step, and safe Codex integration without building a Python orchestrator
- **Options Considered:**
  - Full Python orchestrator (more control, but adds project overhead)
  - Lightweight with Claude Code slash commands (faster, leverages existing tools)
- **Decision:** Lightweight — use `.claude/commands/pm.md` and `.dev.md` slash commands + shell scripts for Codex
- **Approved By:** CEO
- **Rationale:** Minimizes infrastructure overhead, ships faster, uses Claude Code's built-in capabilities

---

## DECISION-002: Dev Execution Style
- **Date:** 2026-04-08
- **Proposed By:** PM
- **Title:** Dev agent executes autonomously
- **Context:** Should Dev check in mid-task or just execute and report?
- **Decision:** Autonomous — Dev completes full task spec, then reports. No mid-task confirmations unless blocker.
- **Approved By:** CEO
- **Rationale:** Faster execution, fewer context switches, Dev can focus on quality

---

## DECISION-003: Session Start Protocol
- **Date:** 2026-04-08
- **Proposed By:** PM
- **Title:** Auto-PM review on every new session
- **Context:** Should PM run automatically or only when explicitly invoked?
- **Decision:** Auto-run — CLAUDE.md instructs Claude to proactively run PM review at start of every session
- **Approved By:** CEO
- **Rationale:** Ensures project health visibility at the start of work, prevents drift

---

## DECISION-004: Frontend Styling Framework
- **Date:** 2026-04-08
- **Proposed By:** PM
- **Title:** Use shadcn/ui + Tailwind CSS
- **Context:** Which component library and styling approach?
- **Decision:** shadcn/ui (pre-built accessible components) + Tailwind CSS (utility classes)
- **Approved By:** CEO
- **Rationale:** Fast to build, accessible out-of-box, consistent with project goals

---

## DECISION-005: Email Linking Strategy
- **Date:** 2026-04-08
- **Proposed By:** Dev (from architectural plan)
- **Title:** Three-tier confidence matching: domain → keyword → semantic
- **Context:** How to match emails to applications?
- **Decision:** 
  - Domain match: 0.9 confidence
  - Keyword match: 0.7 confidence
  - Gemini semantic: variable
  - Ambiguous (multiple matches > 0.7): send to unlinked tray for manual review
- **Approved By:** CEO
- **Rationale:** Balances automation with safety, puts unclear cases in user's hands

---

## DECISION-006: Codex Integration Safety
- **Date:** 2026-04-08
- **Proposed By:** CEO
- **Title:** Codex always works on `codex/*` branch with pre-task guardrails
- **Context:** How to safely bring in external Codex agent without conflict?
- **Decision:**
  - Codex only works on `codex/[task-slug]` branch
  - Dev is blocked if unmerged `codex/*` branches exist
  - PM reviews all Codex work before merge to main
  - CONTRACTOR_BRIEF.md auto-generated on invocation
- **Approved By:** CEO
- **Rationale:** Branch isolation prevents concurrent edits, PM review ensures quality

---

## Future Decisions (TBD)
- Gemini model choice (currently `gemini-1.5-flash`)
- MS Graph rate limit handling
- Frontend testing strategy (Vitest/Jest?)
- Deployment approach (once MVP is complete)
