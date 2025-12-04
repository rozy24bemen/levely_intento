'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/browserClient'
import { useRouter } from 'next/navigation'
import { notifyXPGain } from './XPNotifications'

interface CreateShortCommentFormProps {
  shortId: string
  userId: string
  onCommentAdded: () => void
  onCountUpdate: (newCount: number) => void
}

export default function CreateShortCommentForm({ shortId, userId, onCommentAdded, onCountUpdate }: CreateShortCommentFormProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.from('shorts_comments').insert({
        short_id: shortId,
        author_id: userId,
        content: content.trim(),
      })

      if (error) throw error

      // Get updated count
      const { count } = await supabase
        .from('shorts_comments')
        .select('*', { count: 'exact', head: true })
        .eq('short_id', shortId)

      // Notify XP gain (+3 XP for commenting)
      notifyXPGain(3, 'Comentaste un Short')

      if (count !== null) {
        onCountUpdate(count)
      }
      
      setContent('')
      onCommentAdded()
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 pt-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Añade un comentario..."
          maxLength={500}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!content.trim() || loading}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-full hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
      {error && (
        <p className="text-red-600 text-sm mt-2">{error}</p>
      )}
      <p className="text-xs text-gray-500 mt-1">
        {content.length}/500
      </p>
    </form>
  )
}
