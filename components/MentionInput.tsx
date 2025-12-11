'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

interface User {
  id: string
  username: string
  avatar_url: string | null
  level: number
}

interface MentionInputProps {
  value: string
  onChange: (value: string, mentions: string[]) => void
  placeholder?: string
  maxLength?: number
  disabled?: boolean
  className?: string
  textareaClassName?: string
}

export default function MentionInput({
  value,
  onChange,
  placeholder = 'Escribe tu mensaje...',
  maxLength = 1000,
  disabled = false,
  className = '',
  textareaClassName = ''
}: MentionInputProps) {
  const [suggestions, setSuggestions] = useState<User[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [mentionQuery, setMentionQuery] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Extract mentioned user IDs from text
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    const mentions: string[] = []
    let match

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[2]) // User ID is in the second capture group
    }

    return mentions
  }

  // Search users when typing @
  useEffect(() => {
    const searchUsers = async () => {
      if (!mentionQuery || mentionQuery.length < 1) {
        setSuggestions([])
        return
      }

      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(mentionQuery)}`)
        const data = await response.json()
        setSuggestions(data)
        setSelectedIndex(0)
      } catch (error) {
        console.error('Error searching users:', error)
        setSuggestions([])
      }
    }

    const debounce = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounce)
  }, [mentionQuery])

  // Handle textarea changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart

    setCursorPosition(cursorPos)
    onChange(newValue, extractMentions(newValue))

    // Check if user is typing a mention
    const textBeforeCursor = newValue.slice(0, cursorPos)
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@')

    if (lastAtSymbol !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtSymbol + 1)
      
      // Check if there's a space after @ (mention ended)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionQuery(textAfterAt)
        setShowSuggestions(true)
      } else {
        setShowSuggestions(false)
        setMentionQuery('')
      }
    } else {
      setShowSuggestions(false)
      setMentionQuery('')
    }
  }

  // Insert mention
  const insertMention = (user: User) => {
    if (!textareaRef.current) return

    const textBeforeCursor = value.slice(0, cursorPosition)
    const textAfterCursor = value.slice(cursorPosition)
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@')

    if (lastAtSymbol === -1) return

    // Build mention format: @[username](userId)
    const mention = `@[${user.username}](${user.id})`
    const newValue = 
      value.slice(0, lastAtSymbol) + 
      mention + 
      ' ' + 
      textAfterCursor

    onChange(newValue, extractMentions(newValue))
    setShowSuggestions(false)
    setMentionQuery('')
    setSuggestions([])

    // Focus back and set cursor after mention
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const newCursorPos = lastAtSymbol + mention.length + 1
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === 'Enter' && showSuggestions) {
      e.preventDefault()
      insertMention(suggestions[selectedIndex])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setMentionQuery('')
    }
  }

  // Convert mention format to display format
  const getDisplayValue = (text: string): string => {
    return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')
  }

  return (
    <div className={`relative ${className}`}>
      <textarea
        ref={textareaRef}
        value={getDisplayValue(value)}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        className={textareaClassName}
      />

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          style={{ bottom: '100%', marginBottom: '4px' }}
        >
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              type="button"
              onClick={() => insertMention(user)}
              className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-100 transition ${
                index === selectedIndex ? 'bg-gray-100' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                {user.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.username}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                    {user.username[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900">@{user.username}</p>
                <p className="text-xs text-gray-500">Nivel {user.level}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
