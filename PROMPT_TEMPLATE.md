# Company Research Prompt Template - STRICT FORMAT VERSION

Copy this prompt into Claude, ChatGPT, Gemini, or any LLM and replace `{COMPANY_WEBSITE_URL}` with the actual company website URL.

---

## ⚠️ CRITICAL: FOLLOW FORMAT EXACTLY OR UPLOAD WILL FAIL

Your response MUST:
1. Start with `## Company Overview` as the FIRST line
2. Include all 8 sections in this exact order
3. NOT include any title, preamble, or introduction before `## Company Overview`
4. Return ONLY the 8 sections - nothing else
5. Use `##` (double hash) for section headers
6. Use `-` for bullet lists

If you don't have info for a section, write "Information not readily available." Do NOT skip sections.

---

## Research Company for Interview Preparation

Research {COMPANY_WEBSITE_URL} and provide the following 8 sections in markdown format. Your response must start with `## Company Overview` and include nothing before it.

### Section 1: Company Overview (2-3 sentences)
Summary of the company's mission, industry focus, and what they do.

### Section 2: Key Products & Services (bullet list)
3+ main products/services as bullet list (start each with `-`)

### Section 3: Company Culture (2-3 sentences)
Employee experience, values, work environment, culture description.

### Section 4: Organization Structure (2-3 sentences)
How organized (divisions/teams), employee count, reporting structure.

### Section 5: CEO / Leadership
Current CEO/founder name + brief background. Include 1-2 other key executives.

### Section 6: Recent News (bullet list)
3+ recent announcements, launches, or milestones from 2024-2026 (start each with `-`)

### Section 7: Industry Relevance (2-3 sentences)
Why industry matters, current trends, how they affect this role.

### Section 8: Hiring Focus (2-3 sentences)
What skills/experience this company likely prioritizes for this role.

---

## RULES & FORMAT

✅ DO:
- Start with `## Company Overview` on line 1
- Include all 8 sections in this exact order
- Use `##` for each section header (e.g., `## Company Overview`)
- Use `-` for bullet points in lists
- Keep sections 2-4 sentences (except lists)
- Base info on {COMPANY_WEBSITE_URL} and public knowledge

❌ DON'T:
- Add a title or H1 (no `# Title`)
- Add intro/outro text
- Skip sections or rename them
- Use different bullet format
- Add sections beyond the 8 listed
- Use triple backticks or code blocks
- Include JSON/structured data
- Use different heading levels

---

## EXPECTED OUTPUT EXAMPLE

Your response should look EXACTLY like this (starting immediately with `##`):

```
## Company Overview
Apple designs and manufactures innovative consumer electronics including iPhones, Mac computers, and wearables. Founded in 1976, the company is known for premium products and user-focused design. Apple also provides software and services like iCloud, App Store, and Apple Music.

## Key Products & Services
- iPhone and iPad devices
- Mac computers and laptops  
- Apple Watch and wearables
- Apple Services (iCloud, App Store, Apple Music, AppleCare)

## Company Culture
Apple emphasizes innovation, quality, and attention to detail. Employees describe a mission-driven culture focused on creating great products. The company values creativity but also expects high standards and hard work from team members.

## Organization Structure
Apple has approximately 164,000 employees organized around hardware, software, and services divisions. The company is headquartered in Cupertino, California. Leadership is hierarchical with executives reporting to CEO Tim Cook, who oversees major business units.

## CEO / Leadership
Tim Cook (CEO since 2011, former VP of Operations). Other key executives: Craig Federighi (SVP Software Engineering), John Ternus (SVP Hardware Engineering), Jeff Williams (Chief Operating Officer).

## Recent News
- Introduced iPhone 16 with advanced AI capabilities in September 2024
- Announced Apple Intelligence AI system integrating with devices
- Opened new retail locations in Vietnam and other emerging markets
- Expanded health and wellness features across wearable product line

## Industry Relevance
Consumer technology and AI integration are rapidly growing sectors with intense competition. Companies racing to implement AI in products while maintaining privacy. Consumer expectations for device security, performance, and innovation are at all-time highs. This role helps Apple compete in the AI-driven future of consumer tech.

## Hiring Focus
Apple seeks software and hardware engineers with strong AI/ML skills and experience shipping consumer products at scale. Experience with distributed systems, performance optimization, and cross-functional collaboration is valuable. They prioritize candidates with 5+ years experience in consumer tech and proven impact on shipped products.
```

---

## HOW TO USE

1. Copy the section "Research Company for Interview Preparation" down to "Include sections 2-4 sentences (except lists)"
2. Paste into Claude, ChatGPT, or Gemini chat
3. Replace `{COMPANY_WEBSITE_URL}` with actual company website (e.g., `https://apple.com`)
4. Send prompt to LLM
5. LLM returns markdown starting with `## Company Overview`
6. Copy entire markdown response
7. Save as `.md` file (e.g., `apple_research.md`)
8. Go to Interview Prep page in Job Application CRM
9. Click "📤 Select .md File"
10. Upload file → Auto-parses and displays ✅

---

## TROUBLESHOOTING

**"Upload failed: Markdown must include Company Overview section"**
→ Your markdown doesn't have `## Company Overview` header
→ Make sure the LLM output starts with exactly `## Company Overview`
→ Copy from `##` all the way down (no preamble before it)

**Some sections are empty or missing**
→ LLM skipped a section
→ Copy the prompt again and re-run
→ Be explicit: "Include all 8 sections even if you must write 'Information not available'"

**Headers don't match**
→ LLM used different headers like "## Overview" instead of "## Company Overview"
→ The parser needs exact names
→ Emphasize to LLM: "Use these EXACT header names: Company Overview, Key Products & Services, etc."

---

## TIPS FOR BEST RESULTS

1. **Use the company website URL** - "Visit https://companysite.com" gives LLM real info
2. **Be explicit about format** - Don't just ask for "research" - show the exact format you need
3. **Include example** - Show what the output should look like
4. **Emphasize sections** - List them clearly so LLM doesn't skip any
5. **Use bullet rules** - Be clear that `##` and `-` are required
6. **Copy exactly** - When saving, start with `## Company Overview` (no text before)

---

## QUICK REFERENCE

**Exact headers required (use these exact names):**
1. `## Company Overview`
2. `## Key Products & Services`
3. `## Company Culture`
4. `## Organization Structure`
5. `## CEO / Leadership`
6. `## Recent News`
7. `## Industry Relevance`
8. `## Hiring Focus`

**Bullet format required:**
```
- Item 1
- Item 2
- Item 3
```

**Do NOT use:** `* Item`, `• Item`, `· Item`

---

## Ready? 

Paste this prompt into your LLM, replace the URL, and you're good to go! 🚀
