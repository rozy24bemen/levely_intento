'use client'

import { useState } from 'react'
import { Trash2, MessageCircle, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/browserClient'
import type { Comment } from '@/lib/types'
import Image from 'next/image'
import Link from 'next/link'

interface CommentCardProps {
  comment: Comment
  currentUserId?: string
  onDelete?: () => void
  onReply?: () => void
  isReply?: boolean
}

export default function CommentCard({ comment, currentUserId, onDelete, onReply, isReply = false }: CommentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [isReplying, setIsReplying] = useState(false)
  const [showReplies, setShowReplies] = useState(false)
  const [replies, setReplies] = useState<Comment[]>([])
  const [loadingReplies, setLoadingReplies] = useState(false)
  const supabase = createClient()
  const isOwnComment = currentUserId === comment.author_id

  const handleDelete = async () => {
    if (!isOwnComment || isDeleting) return

    if (!confirm('¿Estás seguro de eliminar este comentario?')) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', comment.id)

      if (error) throw error

      onDelete?.()
    } catch (error) {
      console.error('Error deleting comment:', error)
      alert('Error al eliminar el comentario')
    } finally {
      setIsDeleting(false)
    }
  }

  const loadReplies = async () => {
    if (loadingReplies) return
    
    setLoadingReplies(true)
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          post_id,
          author_id,
          content,
          parent_id,
          replies_count,
          created_at,
          updated_at,
          profiles!comments_author_id_fkey (
            id,
            username,
            avatar_url,
            level
          )
        `)
        .eq('parent_id', comment.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      const transformedData = data?.map((reply: any) => ({
        ...reply,
        profiles: Array.isArray(reply.profiles) ? reply.profiles[0] : reply.profiles
      })) as Comment[]

      setReplies(transformedData || [])
      setShowReplies(true)
    } catch (error) {
      console.error('Error loading replies:', error)
    } finally {
      setLoadingReplies(false)
    }
  }

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim() || isReplying || !currentUserId) return

    setIsReplying(true)
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: comment.post_id,
          author_id: currentUserId,
          content: replyContent.trim(),
          parent_id: comment.id,
        })

      if (error) throw error

      setReplyContent('')
      setShowReplyForm(false)
      onReply?.()
      
      // Reload replies to show the new one
      await loadReplies()
    } catch (error) {
      console.error('Error submitting reply:', error)
      alert('Error al enviar la respuesta')
    } finally {
      setIsReplying(false)
    }
  }

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
        {comment.profiles?.avatar_url ? (
          <Image
            src={comment.profiles.avatar_url}
            alt={comment.profiles.username || 'Usuario'}
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
            {comment.profiles?.username?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Link 
            href={`/profile/${comment.author_id}`}
            className="font-semibold text-gray-900 text-sm hover:text-blue-600 hover:underline transition-colors"
          >
            {comment.profiles?.username || 'Usuario'}
          </Link>
          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
            Nv. {comment.profiles?.level || 1}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(comment.created_at).toLocaleDateString('es-ES', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        <p className="text-gray-700 text-sm whitespace-pre-wrap break-words">
          {comment.content}
        </p>

        {/* Reply button (only show for top-level comments) */}
        {!isReply && currentUserId && (
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Responder
            </button>
            
            {comment.replies_count > 0 && (
              <button
                onClick={() => showReplies ? setShowReplies(false) : loadReplies()}
                className="text-xs text-blue-600 hover:underline"
              >
                {showReplies ? 'Ocultar' : `Ver ${comment.replies_count} ${comment.replies_count === 1 ? 'respuesta' : 'respuestas'}`}
              </button>
            )}
          </div>
        )}

        {/* Reply form */}
        {showReplyForm && !isReply && (
          <form onSubmit={handleSubmitReply} className="mt-3 flex gap-2">
            <input
              type="text"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Escribe una respuesta..."
              maxLength={500}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!replyContent.trim() || isReplying}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Replies */}
        {showReplies && replies.length > 0 && (
          <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-200">
            {replies.map((reply) => (
              <CommentCard
                key={reply.id}
                comment={reply}
                currentUserId={currentUserId}
                onDelete={loadReplies}
                isReply={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete button */}
      {isOwnComment && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition disabled:opacity-50"
          title="Eliminar comentario"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
