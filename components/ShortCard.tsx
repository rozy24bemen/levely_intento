'use client'

import { Heart, MessageCircle, Share2, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/browserClient'
import type { Short } from '@/lib/types'
import { notifyXPGain } from './XPNotifications'
import ShortCommentsList from './ShortCommentsList'
import Link from 'next/link'

interface ShortCardProps {
  short: Short
  currentUserId?: string
  isActive: boolean
}

export default function ShortCard({ short, currentUserId, isActive }: ShortCardProps) {
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(short.likes_count)
  const [commentsCount, setCommentsCount] = useState(short.comments_count)
  const [showComments, setShowComments] = useState(false)
  const [loading, setLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const supabase = createClient()

  // Check if user has already liked this short
  useEffect(() => {
    const checkIfLiked = async () => {
      if (!currentUserId) return
      
      const { data } = await supabase
        .from('shorts_likes')
        .select('id')
        .eq('short_id', short.id)
        .eq('user_id', currentUserId)
        .maybeSingle()
      
      setLiked(!!data)
    }
    
    checkIfLiked()
  }, [currentUserId, short.id, supabase])

  // Auto play/pause based on visibility
  useEffect(() => {
    if (videoRef.current) {
      if (isActive) {
        videoRef.current.play().catch(() => {
          // Autoplay might be blocked
        })
      } else {
        videoRef.current.pause()
      }
    }
  }, [isActive])

  const handleLike = async () => {
    if (!currentUserId || loading) return
    
    setLoading(true)
    try {
      if (liked) {
        // Unlike
        const { error } = await supabase
          .from('shorts_likes')
          .delete()
          .eq('short_id', short.id)
          .eq('user_id', currentUserId)
        
        if (error) {
          console.error('Error al quitar like:', error)
          throw error
        }
        
        setLiked(false)
        setLikesCount(prev => prev - 1)
      } else {
        // Like
        const likeData = { short_id: short.id, user_id: currentUserId }
        
        const { error, data } = await supabase
          .from('shorts_likes')
          .insert(likeData)
        
        if (error) {
          // Si es error 23505 (duplicate key), significa que ya existe el like
          if (error.code === '23505') {
            console.log('El like ya existe, actualizando estado local')
            setLiked(true)
            return
          }
          
          console.error('Error al dar like:', error)
          throw error
        }
        
        setLiked(true)
        setLikesCount(prev => prev + 1)
      }
    } catch (error: any) {
      console.error('Error toggling like:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/shorts/${short.id}`
    if (navigator.share) {
      await navigator.share({
        title: short.title || 'Short en LEVELY',
        url,
      })
    } else {
      await navigator.clipboard.writeText(url)
      alert('Link copiado al portapapeles!')
    }
  }

  return (
    <div className="relative w-full h-[100dvh] snap-start snap-always flex items-center justify-center bg-black overflow-hidden">
      {/* Video */}
      <video
        ref={videoRef}
        src={short.video_url}
        className="w-full h-full object-contain"
        loop
        playsInline
        preload="auto"
      />

      {/* Gradient overlays for better text visibility */}
      <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

      {/* Author info (top left) */}
      <Link 
        href={`/profile/${short.author_id}`}
        className="absolute top-4 left-4 flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-lg">
          {short.profiles?.username?.[0]?.toUpperCase() || 'U'}
        </div>
        <div>
          <p className="text-white font-semibold text-sm drop-shadow-lg">
            {short.profiles?.username || 'Usuario'}
          </p>
          <p className="text-white/80 text-xs drop-shadow-lg">
            Nivel {short.profiles?.level || 1}
          </p>
        </div>
      </Link>

      {/* Content info (bottom left) */}
      <div className="absolute bottom-20 left-4 right-20 space-y-2">
        {short.title && (
          <h3 className="text-white font-bold text-lg drop-shadow-lg">
            {short.title}
          </h3>
        )}
        {short.description && (
          <p className="text-white text-sm drop-shadow-lg line-clamp-2">
            {short.description}
          </p>
        )}
      </div>

      {/* Actions (right side) */}
      <div className="absolute right-4 bottom-20 flex flex-col items-center gap-6">
        {/* Like button */}
        <button
          onClick={handleLike}
          disabled={!currentUserId || loading}
          className="flex flex-col items-center gap-1 group disabled:opacity-50"
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            liked 
              ? 'bg-red-500 scale-110' 
              : 'bg-white/20 backdrop-blur-sm group-hover:bg-white/30 group-hover:scale-110'
          }`}>
            <Heart className={`w-7 h-7 ${liked ? 'text-white fill-current' : 'text-white'}`} />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-lg">
            {likesCount > 0 ? likesCount : ''}
          </span>
        </button>
        {/* Comments button */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 group-hover:scale-110 transition-all">
            <MessageCircle className="w-7 h-7 text-white" />
          </div>
          <span className="text-white text-xs font-semibold drop-shadow-lg">
            {commentsCount > 0 ? commentsCount : ''}
          </span>
        </button>

        {/* Share button */}
        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-1 group"
        >
          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 group-hover:scale-110 transition-all">
            <Share2 className="w-7 h-7 text-white" />
          </div>
        </button>
      </div>

      {/* Comments overlay (if opened) */}
      {showComments && (
        <div 
          className="absolute inset-0 bg-black/50 flex items-end justify-end z-50"
          onClick={() => setShowComments(false)}
        >
          <div 
            className="w-full md:w-[440px] md:h-full bg-white md:rounded-none rounded-t-3xl p-6 max-h-[85vh] md:max-h-full flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
              <h3 className="text-xl font-bold flex-1">
                Comentarios {commentsCount > 0 && `(${commentsCount})`}
              </h3>
              <button
                onClick={() => setShowComments(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments list with scroll */}
            <div className="flex-1 overflow-y-auto min-h-0">{/* min-h-0 is crucial for flex scroll */}
              <ShortCommentsList
                shortId={short.id}
                currentUserId={currentUserId}
                initialCount={commentsCount}
                onCountUpdate={(newCount) => setCommentsCount(newCount)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
