# Interview Prep - Manual Research Upload Guide

## Quick Start

### Step 1: Get the Prompt Template
The `PROMPT_TEMPLATE.md` file in the project root contains a ready-to-use prompt. Here's what it looks like:

```markdown
## Research Company for Interview Preparation

Research the following company for interview preparation. Visit {COMPANY_WEBSITE_URL} and extract information about the company.

Generate a comprehensive markdown report with the following sections:

## Company Overview
[2-3 sentence summary...]

## Key Products & Services
- [Product 1]
- [Product 2]
...
```

### Step 2: Use with Any LLM

#### With Claude (claude.com)
1. Go to claude.com
2. Create a new chat
3. Copy the entire PROMPT_TEMPLATE.md
4. Replace `{COMPANY_WEBSITE_URL}` with the company website (e.g., `https://techcorp.com`)
5. Paste into Claude and send
6. Wait for response (usually 1-2 minutes)
7. Copy the markdown output

#### With ChatGPT (chat.openai.com)
1. Same process as Claude
2. ChatGPT works great with markdown

#### With Gemini (gemini.google.com)
1. Same process
2. Gemini's free tier works fine

### Step 3: Save the Output
Once you have the markdown output from the LLM:
1. Copy the markdown text
2. Create a new file: `company_name_research.md`
3. Paste the markdown into the file
4. Save (your Downloads folder is fine)

Example filename: `techcorp_research.md`, `microsoft_research.md`, etc.

### Step 4: Upload to the App
1. Open the Job Application CRM frontend: http://localhost:3001
2. Click on an application to view its details
3. Go to the **Interview Prep** tab
4. You'll see a new section: "📄 Upload Company Research"
5. Click the "📤 Select .md File" button
6. Choose your markdown file
7. The app will automatically parse and display the research in the tiles

---

## Example Workflow

### Real-World Example: Researching Google

#### 1. Prompt Template (with URL filled in)
```
## Research Company for Interview Preparation

Research the following company for interview preparation. Visit https://google.com and extract information about the company.

[rest of template...]
```

#### 2. Claude Response (example output)
```markdown
## Company Overview
Google is a multinational technology company focused on internet search, advertising, cloud services, and artificial intelligence. Founded in 1998, it's now part of Alphabet Inc. and serves billions of users worldwide.

## Key Products & Services
- Google Search
- Google Ads (advertising platform)
- Google Cloud Platform
- Android mobile OS
- YouTube
- Gmail and Workspace
- Chrome browser

## Company Culture
Innovation-focused culture with emphasis on creativity and autonomy. Famous for 20% time (work on passion projects). Strong focus on diversity and inclusion. Work-life balance important. Collaborative team environment.

## Organization Structure
Organized by major business units (Search, Ads, Cloud, Other Bets). Google Cloud led by SVP. Reports to CEO. Around 190,000 employees globally. Structured around product teams with cross-functional collaboration.

## CEO / Leadership
Sundar Pichai, CEO (ex-Google, led Chrome and Android)
Ruth Porat, CFO
Jack Krawczyk, VP of Product Management

## Recent News
- Investing heavily in AI and LLM capabilities
- Launched Gemini AI model (2024)
- Expanded Google Cloud with new services
- Increasing focus on AI-powered features across all products
- Multiple antitrust lawsuits and regulatory scrutiny

## Industry Relevance
Tech industry competitive and fast-moving. AI becoming critical to competitiveness. Cloud market booming. Search facing new competition from AI chatbots. Regulatory pressure affecting business model.

## Hiring Focus
Looking for ML engineers with LLM experience. Need full-stack engineers for cloud products. Security engineers for privacy-conscious products. Product managers with AI expertise. Strong preference for those familiar with scale.
```

#### 3. Save as File
Create `google_research.md` with the above content.

#### 4. Upload in App
- Go to Google application in CRM
- Click Interview Prep
- Upload the `google_research.md` file
- ✅ All tiles populate automatically!

---

## What to Expect

### After Upload
You'll see all 8 research sections populated in expandable tiles:

1. **🏢 Company Overview** - Summary of the company
2. **📦 Key Products & Services** - List of main products (appears as bullet points)
3. **🎯 Company Culture** - Workplace environment and values
4. **🏛️ Organization Structure** - How the company is organized
5. **👔 CEO / Leadership** - CEO and key executives
6. **📰 Recent News** - Recent company news and announcements
7. **📊 Industry Relevance** - Why the industry matters for your role
8. **🎖️ Hiring Focus** - What they're likely looking for in candidates

### Tiles are Expandable
- Click any tile to expand/collapse
- Copy button to copy all research to clipboard
- Edit button to manually fix any missing fields

---

## Tips for Best Results

### LLM Prompt Tips
1. **Be specific about the company** - Provide the exact website URL
2. **Be clear about format** - The template specifies the format clearly
3. **Copy the exact template** - Don't paraphrase it
4. **Check the output** - Verify all 8 sections are present
5. **Include the company website** - LLMs do better with web context

### Markdown File Tips
1. **Save as UTF-8** - Standard text encoding
2. **Keep the ## headers** - The app looks for these specifically
3. **Use bullet points** for lists (start with `-`)
4. **Don't add extra sections** - Stick to the 8 specified sections
5. **Preserve formatting** - Copy-paste directly from LLM output

### Upload Tips
1. **File must be .md** - Not .txt, not .docx, only .md
2. **Check for typos** - LLMs sometimes get section names wrong
3. **Company Overview is required** - Everything else is optional
4. **Can re-upload anytime** - Upload a new file to update all research
5. **Works offline** - No API calls, everything is local

---

## Troubleshooting

### "File must be .md"
**Problem:** You're trying to upload a .txt or .docx file
**Solution:** Save as `.md` file (markdown format)

### "Markdown must include Company Overview section"
**Problem:** The parser couldn't find a "## Company Overview" section
**Solution:** Copy the template exactly and make sure the section header matches

### Some tiles are empty
**Problem:** The LLM might have missed some sections or named them differently
**Solution:** Use the "✏️ Edit Missing Fields" button to fill them in manually

### Upload seems stuck
**Problem:** Browser not responding
**Solution:** Wait 5 seconds. If still stuck, reload the page and try again

### Can't find the upload button
**Problem:** You're not on Interview Prep page
**Solution:** 
1. Click an application
2. Look for "Interview Prep" section
3. The upload area should be at the top

---

## Comparison: Old vs New

### Old Way (API-based)
- You: Click "Research"
- App: Calls Claude API
- Wait: 1-2 minutes
- Risk: API quota exceeded
- Cost: $0.10-0.50 per research
- Control: None

### New Way (Manual)
- You: Copy prompt template to Claude/ChatGPT/Gemini
- You: Get markdown output
- You: Save as .md file
- You: Upload .md file
- App: Parses and displays instantly
- Cost: Free (you choose your LLM)
- Control: Full

---

## Cost Saving

The old system used $0.10-0.50 per company research. 

**New system: $0 per research** (you use your own LLM credits if any)

Or use free LLM tiers:
- Claude: Free tier at claude.com
- ChatGPT: Free tier at chat.openai.com
- Gemini: Always free at gemini.google.com

---

## Questions?

**Q: Do I need to research every company?**
A: No! Research only companies you're seriously interested in.

**Q: Can I use GPT-4, Claude 3.5, etc?**
A: Yes! Any LLM works. Use whichever you have access to.

**Q: What if the LLM gives bad research?**
A: Edit the fields manually after upload, or try again with a different LLM.

**Q: Can I delete research?**
A: Edit tiles to clear them, or upload a new file to overwrite.

**Q: Does this work without internet?**
A: After uploading the .md file, yes! Everything is local.

**Q: Can I share research between applications?**
A: Not automatically, but you can upload the same .md to multiple companies.

---

## Next Steps

1. **Open the app:** http://localhost:3001
2. **Find an application** with a job you care about
3. **Copy PROMPT_TEMPLATE.md** to your LLM of choice
4. **Replace {COMPANY_WEBSITE_URL}** with the real company website
5. **Get markdown output** from the LLM
6. **Save as .md file**
7. **Upload to the app** via Interview Prep page
8. **See research populate** automatically! ✅

Good luck with your interviews! 🚀
