'use client'

import { createClient } from '@/lib/supabase/browserClient'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Image as ImageIcon, Video as VideoIcon } from 'lucide-react'
import { notifyXPGain } from './XPNotifications'
import ImageUploader from './ImageUploader'
import VideoUploader from './VideoUploader'
import MentionInput from './MentionInput'

type MediaMode = 'none' | 'image' | 'video'

export default function CreatePostForm({ userId }: { userId: string }) {
  const [content, setContent] = useState('')
  const [mentions, setMentions] = useState<string[]>([])
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaMode, setMediaMode] = useState<MediaMode>('none')
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
      // Create post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          author_id: userId,
          content: content.trim(),
          media_url: mediaUrl,
          media_type: mediaMode === 'none' ? null : mediaMode,
        })
        .select('id')
        .single()

      if (postError) throw postError

      // Save mentions if any
      if (mentions.length > 0 && post) {
        const mentionRecords = mentions.map(mentionedUserId => ({
          mentioner_id: userId,
          mentioned_user_id: mentionedUserId,
          post_id: post.id,
        }))

        const { error: mentionsError } = await supabase
          .from('mentions')
          .insert(mentionRecords)

        if (mentionsError) console.error('Error saving mentions:', mentionsError)
      }

      // Notificar ganancia de XP por crear post (20 XP video, 15 XP imagen, 10 XP texto)
      const xpAmount = mediaMode === 'video' ? 20 : mediaMode === 'image' ? 15 : 10
      const message = 
        mediaMode === 'video' ? 'Publicaste un post con video' :
        mediaMode === 'image' ? 'Publicaste un post con imagen' :
        'Publicaste un post'
      notifyXPGain(xpAmount, message)

      setContent('')
      setMentions([])
      setMediaUrl(null)
      setMediaMode('none')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMediaModeChange = (mode: MediaMode) => {
    setMediaMode(mode)
    setMediaUrl(null)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <MentionInput
          value={content}
          onChange={(newContent, newMentions) => {
            setContent(newContent)
            setMentions(newMentions)
          }}
          placeholder="¿Qué estás pensando? Usa @ para mencionar usuarios"
          maxLength={5000}
          disabled={loading}
          textareaClassName="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[80px]"
        />

        {/* Media type selector */}
        {mediaMode === 'none' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleMediaModeChange('image')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition"
            >
              <ImageIcon className="w-4 h-4" />
              Añadir imagen
            </button>
            <button
              type="button"
              onClick={() => handleMediaModeChange('video')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition"
            >
              <VideoIcon className="w-4 h-4" />
              Añadir video
            </button>
          </div>
        )}

        {/* Image uploader */}
        {mediaMode === 'image' && (
          <div>
            <ImageUploader
              userId={userId}
              onImageUploaded={(url) => setMediaUrl(url)}
              onImageRemoved={() => handleMediaModeChange('none')}
            />
          </div>
        )}

        {/* Video uploader */}
        {mediaMode === 'video' && (
          <div>
            <VideoUploader
              userId={userId}
              onVideoUploaded={(url) => setMediaUrl(url)}
              onVideoRemoved={() => handleMediaModeChange('none')}
            />
          </div>
        )}
        
        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {content.length}/5000 caracteres
            {mediaMode === 'video' && <span className="ml-2 text-purple-600">• Con video (+10 XP extra)</span>}
            {mediaMode === 'image' && <span className="ml-2 text-blue-600">• Con imagen (+5 XP extra)</span>}
          </span>
          <button
            type="submit"
            disabled={!content.trim() || loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </form>
    </div>
  )
}
