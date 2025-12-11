'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/browserClient'
import { notifyXPGain } from './XPNotifications'
import MentionInput from './MentionInput'

interface CreateCommentFormProps {
  postId: string
  userId: string
  onCommentCreated?: () => void
}

export default function CreateCommentForm({ postId, userId, onCommentCreated }: CreateCommentFormProps) {
  const [content, setContent] = useState('')
  const [mentions, setMentions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      // Create comment
      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: userId,
          content: content.trim(),
        })
        .select('id')
        .single()

      if (commentError) throw commentError

      // Save mentions if any
      if (mentions.length > 0 && comment) {
        const mentionRecords = mentions.map(mentionedUserId => ({
          mentioner_id: userId,
          mentioned_user_id: mentionedUserId,
          comment_id: comment.id,
        }))

        const { error: mentionsError } = await supabase
          .from('mentions')
          .insert(mentionRecords)

        if (mentionsError) console.error('Error saving mentions:', mentionsError)
      }

      // Notificar ganancia de XP por comentar
      notifyXPGain(3, 'Comentaste en un post')

      setContent('')
      setMentions([])
      onCommentCreated?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 pt-4">
      <div className="flex gap-3">
        <MentionInput
          value={content}
          onChange={(newContent, newMentions) => {
            setContent(newContent)
            setMentions(newMentions)
          }}
          placeholder="Escribe un comentario... Usa @ para mencionar"
          maxLength={1000}
          disabled={loading}
          className="flex-1"
          textareaClassName="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm min-h-[60px]"
        />
        <button
          type="submit"
          disabled={!content.trim() || loading}
          className="self-end px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          {loading ? 'Enviando...' : 'Enviar'}
        </button>
      </div>

      {error && (
        <div className="mt-2 p-2 bg-red-50 text-red-600 text-xs rounded">
          {error}
        </div>
      )}

      <div className="mt-1 text-xs text-gray-500">
        {content.length}/1000 caracteres
      </div>
    </form>
  )
}
