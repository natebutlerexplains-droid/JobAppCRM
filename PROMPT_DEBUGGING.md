# Prompt Format Debugging & Solution

## What Happened

You used the original prompt with Claude and got **excellent research content**, but it failed to upload because:

### ❌ What Claude Created
```
# Miami Jewish Health at 85: ambitious expansion amid financial strain

[Excellent detailed research article...]

## A capital-project pipeline...
## PACE, GUIDE, and the MIND Institute...
```

**Problem:** Started with `# Title` (H1), not `## Company Overview` (H2)

### ✅ What the Parser Expects
```
## Company Overview
[Content about company]

## Key Products & Services
- Product 1
- Product 2

## Company Culture
[Content]

## Organization Structure
[Content]

## CEO / Leadership
[Content]

## Recent News
- News 1
- News 2

## Industry Relevance
[Content]

## Hiring Focus
[Content]
```

**Why:** The parser looks for these 8 exact headers in this exact order

---

## Why the Original Prompt Failed

The original prompt said:
> "Generate a comprehensive markdown report with the following sections."

This was **too flexible**. Claude interpreted it as "write a research article" and:
- Added an H1 title
- Used section subheadings
- Wrote in article/narrative format
- Didn't follow the strict section-header format

The **content quality was excellent**, but **format was wrong**.

---

## Solution: New STRICT Format Prompt

I've updated `PROMPT_TEMPLATE.md` with a **much more explicit** version that:

### 1. **Leads with warnings** ⚠️
```
⚠️ CRITICAL: Your response must start with "## Company Overview" on the first line.
Do NOT add a title or preamble.
```

### 2. **Uses examples** 📋
Shows exactly what the output should look like with an example

### 3. **Lists rules explicitly** ✅❌
```
✅ DO:
- Start with "## Company Overview" on line 1
- Use "##" for each section header

❌ DON'T:
- Add a title or H1 heading
- Add intro/outro text
```

### 4. **Repeats critical points** 🔁
Mentions the format requirement multiple times so LLM doesn't forget

### 5. **Includes troubleshooting** 🛠️
Explains what to do if something goes wrong

---

## Test with Miami Jewish Health Example

**Original prompt output:**
```
# Miami Jewish Health at 85: ambitious expansion...
## A capital-project pipeline...
```
❌ Parser rejects: No `## Company Overview`

**New strict prompt output:**
```
## Company Overview
Miami Jewish Health is an 85-year-old nonprofit geriatric healthcare provider...

## Key Products & Services
- Skilled nursing and memory care
- PACE (Programs of All-Inclusive Care)
- Rehabilitation services
- Dementia research programs
```
✅ Parser accepts: Correct format

---

## What to Do Now

### Option 1: Use the New Prompt (Recommended)
1. Go to `PROMPT_TEMPLATE.md`
2. Copy the new, strict version
3. Paste into Claude/ChatGPT/Gemini
4. Replace `{COMPANY_WEBSITE_URL}` with actual URL
5. Get response → Should parse correctly ✅

### Option 2: Fix the Existing File Manually
The Miami Jewish Health research is **actually excellent**. You could:

1. Extract the key information from what Claude wrote
2. Manually format it into the 8-section structure
3. Save as `.md` file
4. Upload

**But:** This defeats the purpose. The whole point is to automate this.

---

## Key Takeaway

**Good Research ≠ Right Format**

Claude created amazing content, but didn't follow the format rules. The solution isn't better research—it's **clearer format requirements**.

The new prompt is **much more explicit** about:
- Starting with `## Company Overview` (not `#`)
- Including all 8 sections (not article format)
- Using specific bullet styles (`-` not `*`)
- Not adding introductions or titles

---

## Updated Files

1. **PROMPT_TEMPLATE.md** - Rewritten with strict format rules
2. **PromptTemplateModal.jsx** - Updated modal shows new prompt
3. This file - Explains the issue and solution

---

## Testing the Fix

**To verify it works:**

1. Open the app: http://localhost:3001
2. Go to Interview Prep
3. Click "Use the prompt template"
4. Copy the new prompt
5. Paste into Claude
6. Replace URL with a real company site
7. Get response
8. **Check that first line is `## Company Overview`** ✅
9. Copy and save as `.md`
10. Upload → Should work! ✅

---

## Why Format Matters

Our parser is **very literal**:
- It looks for `## Company Overview` (not `## Overview`)
- It expects 8 sections in order
- It auto-converts bullets to arrays

This is by design—it keeps the parsing simple and reliable. The tradeoff is that users must follow the format.

The new prompt makes the format **unambiguous** so LLMs follow it correctly.

---

## Future Improvements (Optional)

If you want even better format control, consider:

1. **Add regex validation** - More helpful error messages
2. **Show expected format inline** - Highlight missing sections
3. **Auto-convert formats** - Try to parse article-style research too (risky)
4. **Template confirmation** - Show preview before saving

But for now, the strict prompt should solve the issue! 🚀
