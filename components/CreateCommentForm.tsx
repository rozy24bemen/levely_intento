'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/browserClient'
import { notifyXPGain } from './XPNotifications'

interface CreateCommentFormProps {
  postId: string
  userId: string
  onCommentCreated?: () => void
}

export default function CreateCommentForm({ postId, userId, onCommentCreated }: CreateCommentFormProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        author_id: userId,
        content: content.trim(),
      })

      if (error) throw error

      // Notificar ganancia de XP por comentar
      notifyXPGain(3, 'Comentaste en un post')

      setContent('')
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
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escribe un comentario..."
          maxLength={1000}
          rows={2}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm"
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
