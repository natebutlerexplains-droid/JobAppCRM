import { useState } from 'react'
import { X } from 'lucide-react'

export function PromptTemplateModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false)

  const promptContent = `⚠️ CRITICAL: Your response must start with "## Company Overview" on the first line. Do NOT add a title or preamble. Include all 8 sections below in this exact order.

Research {COMPANY_WEBSITE_URL} and provide these 8 sections in markdown. Your response must start with "## Company Overview" and include nothing before it.

## Company Overview
2-3 sentences summarizing the company's mission, industry focus, and core business.

## Key Products & Services
3+ main products/services as bullet list (each line starting with "-")
- [Product 1]
- [Product 2]
- [Product 3]

## Company Culture
2-3 sentences describing employee experience, values, and work environment.

## Organization Structure
2-3 sentences about how organized, employee count, major divisions/teams.

## CEO / Leadership
CEO/founder name and background. Include 1-2 other key executives if available.

## Recent News
3+ recent announcements or milestones from 2024-2026 (bullet list)
- [News item 1]
- [News item 2]
- [News item 3]

## Industry Relevance
2-3 sentences about industry trends and how they affect this specific role.

## Hiring Focus
2-3 sentences on what skills/experience this company prioritizes for this role.

---

CRITICAL RULES:
✅ Start with "## Company Overview" on line 1
✅ Include all 8 sections in this exact order
✅ Use "##" (double hash) for headers
✅ Use "-" for bullet lists
❌ Do NOT add a title or H1 heading
❌ Do NOT skip any sections
❌ Do NOT add intro/outro text before Company Overview
❌ Do NOT use JSON or code blocks`

  const handleCopy = () => {
    navigator.clipboard.writeText(promptContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white uppercase tracking-widest">
            📋 Research Prompt (STRICT FORMAT)
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-red-900/20 border border-red-700 text-red-300 p-3 text-sm rounded">
            <p className="font-bold">⚠️ IMPORTANT:</p>
            <p className="mt-2 text-xs">The LLM MUST start its response with <code className="bg-red-900/50 px-1">## Company Overview</code> on line 1. No title, no intro. If it adds a title, the upload will fail.</p>
          </div>

          <div className="bg-blue-900/20 border border-blue-700 text-blue-300 p-3 text-sm rounded">
            <p className="font-bold">💡 How to use:</p>
            <ol className="mt-2 space-y-1 text-xs ml-4 list-decimal">
              <li>Copy this prompt (click "Copy All" button below)</li>
              <li>Paste into Claude, ChatGPT, or Gemini</li>
              <li>Replace <code className="bg-blue-900/50 px-1">{"{COMPANY_WEBSITE_URL}"}</code> with actual company website</li>
              <li>Send to LLM and request it save the response as a .md file (final deliverable)</li>
              <li>Download the .md file from your LLM</li>
              <li>Upload the file to this app using the "📤 Select .md File" button</li>
            </ol>
          </div>

          {/* Prompt Content */}
          <div className="bg-slate-800/50 border border-slate-700 p-4 rounded font-mono text-xs whitespace-pre-wrap break-words text-slate-300 max-h-96 overflow-y-auto">
            {promptContent}
          </div>

          <div className="bg-yellow-900/20 border border-yellow-700 p-3 rounded text-xs text-yellow-300">
            <p className="font-bold mb-2">⚡ Why strict format?</p>
            <p>The app expects specific section headers in a specific order. If the LLM changes headers or adds a title, the parser won't recognize it. This prompt forces the correct format.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900 border-t border-slate-700 p-4 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase text-sm transition-colors"
            style={{ borderRadius: '0px' }}
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            className={`px-4 py-2 font-bold uppercase text-sm transition-colors ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            style={{ borderRadius: '0px' }}
          >
            {copied ? '✓ Copied!' : '📋 Copy All'}
          </button>
        </div>
      </div>
    </div>
  )
}
