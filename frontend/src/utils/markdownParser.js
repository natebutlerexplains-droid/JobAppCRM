/**
 * Markdown Parser for Company Research
 *
 * Parses markdown files with ## section headers and extracts:
 * - Plain text sections (overview, culture, structure, ceo info, industry, hiring)
 * - Bullet list sections (products, news) → converted to arrays
 */

export function parseMarkdownResearch(markdown) {
  const sections = {
    company_overview: '',
    key_products: [],
    company_culture: '',
    org_structure: '',
    ceo_info: '',
    recent_news: [],
    industry_relevance: '',
    hiring_focus: ''
  }

  // Split by ## headers and extract content
  // Pattern: ## Header\nContent\n## Next Header or EOF
  const regex = /## ([^\n]+)\n([\s\S]*?)(?=## |\Z)/g
  let match

  while ((match = regex.exec(markdown)) !== null) {
    const header = match[1].trim().toLowerCase()
    let content = match[2].trim()

    // Parse based on header name
    if (header.includes('company overview')) {
      sections.company_overview = content
    } else if (header.includes('key products') || header.includes('products & services')) {
      sections.key_products = parseBulletList(content)
    } else if (header.includes('company culture')) {
      sections.company_culture = content
    } else if (header.includes('organization structure') || header.includes('org structure')) {
      sections.org_structure = content
    } else if (header.includes('ceo') || header.includes('leadership')) {
      sections.ceo_info = content
    } else if (header.includes('recent news')) {
      sections.recent_news = parseBulletList(content)
    } else if (header.includes('industry relevance')) {
      sections.industry_relevance = content
    } else if (header.includes('hiring focus')) {
      sections.hiring_focus = content
    }
  }

  // Validate that at least company_overview is present
  if (!sections.company_overview) {
    throw new Error('Markdown must include "## Company Overview" section')
  }

  return sections
}

/**
 * Parse bullet list into array of strings
 * Handles markdown bullets: - item
 */
function parseBulletList(text) {
  return text
    .split('\n')
    .filter(line => line.trim().startsWith('-'))
    .map(line => line.replace(/^-\s*/, '').trim())
    .filter(item => item.length > 0)
}
