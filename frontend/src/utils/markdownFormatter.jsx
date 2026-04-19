/**
 * Format markdown text for display in React
 * Handles: **bold**, line breaks, spacing
 */
export function formatMarkdownText(text) {
  if (!text) return null

  // Split by double newlines to create paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim())

  return paragraphs.map((para, idx) => (
    <div key={idx} className="mb-3">
      {para.split('\n').map((line, lineIdx) => {
        if (!line.trim()) return null

        // Split line by **text** pattern and render with bold
        const parts = line.split(/(\*\*[^*]+\*\*)/g)

        return (
          <div key={lineIdx} className="mb-1">
            {parts.map((part, partIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                // Bold text
                return <strong key={partIdx} className="font-bold text-white">{part.slice(2, -2)}</strong>
              }
              return <span key={partIdx}>{part}</span>
            })}
          </div>
        )
      })}
    </div>
  ))
}
