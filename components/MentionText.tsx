import Link from 'next/link'

interface MentionTextProps {
  text: string
  className?: string
}

export default function MentionText({ text, className = '' }: MentionTextProps) {
  // Parse text and replace @[username](userId) with clickable links
  const parseText = (content: string) => {
    const parts: (string | JSX.Element)[] = []
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    let lastIndex = 0
    let match

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index))
      }

      // Add mention link
      const username = match[1]
      const userId = match[2]
      parts.push(
        <Link
          key={`mention-${userId}-${match.index}`}
          href={`/profile/${userId}`}
          className="text-blue-600 hover:underline font-medium"
        >
          @{username}
        </Link>
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex))
    }

    return parts.length > 0 ? parts : [content]
  }

  return (
    <span className={className}>
      {parseText(text)}
    </span>
  )
}
