'use client'

import { createClient } from '@/lib/supabase/browserClient'
import { useState } from 'react'
import { Heart, MessageCircle } from 'lucide-react'
import CommentsList from './CommentsList'
import ImageModal from './ImageModal'
import type { Post } from '@/lib/types'

export default function PostCard({ post, currentUserId }: { post: Post; currentUserId?: string }) {
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0)
  const [showComments, setShowComments] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleLike = async () => {
    if (!currentUserId || loading) return
    
    setLoading(true)
    try {
      if (liked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUserId)
        
        if (!error) {
          setLiked(false)
          setLikesCount(prev => prev - 1)
        }
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: post.id, user_id: currentUserId })
        
        if (!error) {
          setLiked(true)
          setLikesCount(prev => prev + 1)
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <article className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
          {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">
              {post.profiles?.username || 'Usuario'}
            </h3>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
              Nivel {post.profiles?.level || 1}
            </span>
          </div>
          <time className="text-sm text-gray-500">
            {new Date(post.created_at).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
        </div>
      </div>

      <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>

      {post.media_url && (
        <div 
          className="relative w-full aspect-square rounded-lg overflow-hidden mb-4 cursor-pointer group"
          onClick={() => setShowImageModal(true)}
        >
          <img
            src={post.media_url}
            alt="Post media"
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium">
              Click para ver completa
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
        <button
          onClick={handleLike}
          disabled={!currentUserId || loading}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition ${
            liked
              ? 'bg-red-50 text-red-600'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
          <span className="font-medium">{likesCount}</span>
        </button>

        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition ${
            showComments
              ? 'bg-blue-50 text-blue-600'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="font-medium">{commentsCount}</span>
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <CommentsList
          postId={post.id}
          currentUserId={currentUserId}
          initialCount={commentsCount}
        />
      )}

      {/* Image modal */}
      {showImageModal && post.media_url && (
        <ImageModal
          imageUrl={post.media_url}
          onClose={() => setShowImageModal(false)}
        />
      )}
    </article>
  )
}
