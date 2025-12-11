'use client'

import { createClient } from '@/lib/supabase/browserClient'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Image as ImageIcon, Video as VideoIcon, Send } from 'lucide-react'
import { notifyXPGain } from './XPNotifications'
import ImageUploader from './ImageUploader'
import VideoUploader from './VideoUploader'
import MentionInput from './MentionInput'
import Image from 'next/image'

type MediaMode = 'none' | 'image' | 'video'

type CreatePostModalProps = {
  isOpen: boolean
  onClose: () => void
  userId: string
  userProfile?: {
    username: string
    avatar_url: string | null
  } | null
}

export default function CreatePostModal({ isOpen, onClose, userId, userProfile }: CreatePostModalProps) {
  const [content, setContent] = useState('')
  const [mentions, setMentions] = useState<string[]>([])
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaMode, setMediaMode] = useState<MediaMode>('none')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Resetear formulario cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      setContent('')
      setMentions([])
      setMediaUrl(null)
      setMediaMode('none')
      setError(null)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
        const mentionRecords = mentions.map((mentionedUserId: string) => ({
          mentioner_id: userId,
          mentioned_user_id: mentionedUserId,
          post_id: post.id,
        }))

        const { error: mentionsError } = await supabase
          .from('mentions')
          .insert(mentionRecords)

        if (mentionsError) console.error('Error saving mentions:', mentionsError)
      }

      // Notificar ganancia de XP por crear post
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
      onClose()
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

  const charCount = content.length
  const maxChars = 5000
  const charPercentage = (charCount / maxChars) * 100

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <h2 className="text-lg font-bold text-gray-900">Crear Publicación</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-full p-2 transition"
              title="Cerrar"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* User Info */}
              {userProfile && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    {userProfile.avatar_url ? (
                      <Image
                        src={userProfile.avatar_url}
                        alt={userProfile.username}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {userProfile.username[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{userProfile.username}</p>
                  </div>
                </div>
              )}

              {/* Text Input */}
              <MentionInput
                value={content}
                onChange={(newContent, newMentions) => {
                  setContent(newContent)
                  setMentions(newMentions)
                }}
                placeholder="¿Qué estás pensando? Usa @ para mencionar usuarios"
                maxLength={maxChars}
                disabled={loading}
                textareaClassName="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[120px] text-base"
              />

              {/* Character Counter */}
              <div className="flex items-center justify-between">
                <div className="w-full bg-gray-200 rounded-full h-2 mr-3">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      charPercentage > 90 ? 'bg-red-500' :
                      charPercentage > 75 ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(charPercentage, 100)}%` }}
                  />
                </div>
                <span className={`text-sm font-medium whitespace-nowrap ${
                  charPercentage > 90 ? 'text-red-500' :
                  charPercentage > 75 ? 'text-yellow-500' :
                  'text-gray-600'
                }`}>
                  {charCount}/{maxChars}
                </span>
              </div>

              {/* Media Preview */}
              {mediaUrl && (
                <div className="relative rounded-xl overflow-hidden bg-gray-100">
                  {mediaMode === 'image' ? (
                    <Image
                      src={mediaUrl}
                      alt="Preview"
                      width={400}
                      height={300}
                      className="w-full h-auto object-cover max-h-64"
                    />
                  ) : (
                    <video
                      src={mediaUrl}
                      controls
                      className="w-full h-auto max-h-64"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMediaUrl(null)
                      setMediaMode('none')
                    }}
                    className="absolute top-2 right-2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full p-2 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Media Uploaders */}
              {mediaMode === 'image' && !mediaUrl && (
                <ImageUploader
                  userId={userId}
                  onImageUploaded={(url: string) => setMediaUrl(url)}
                  onImageRemoved={() => handleMediaModeChange('none')}
                />
              )}

              {mediaMode === 'video' && !mediaUrl && (
                <VideoUploader
                  userId={userId}
                  onVideoUploaded={(url: string) => setMediaUrl(url)}
                  onVideoRemoved={() => handleMediaModeChange('none')}
                />
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                {/* Media Buttons */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleMediaModeChange(mediaMode === 'image' ? 'none' : 'image')}
                    disabled={loading || mediaUrl !== null}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition font-medium ${
                      mediaMode === 'image'
                        ? 'bg-blue-100 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title="Añadir imagen"
                  >
                    <ImageIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Imagen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMediaModeChange(mediaMode === 'video' ? 'none' : 'video')}
                    disabled={loading || mediaUrl !== null}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition font-medium ${
                      mediaMode === 'video'
                        ? 'bg-purple-100 text-purple-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title="Añadir video"
                  >
                    <VideoIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Video</span>
                  </button>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Publish Button */}
                <button
                  type="submit"
                  disabled={loading || !content.trim() || charCount > maxChars}
                  className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold shadow-lg hover:shadow-xl"
                  title="Publicar"
                >
                  <Send className="w-5 h-5" />
                  <span>{loading ? 'Publicando...' : 'Publicar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
