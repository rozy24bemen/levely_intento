'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Video as VideoIcon } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browserClient'
import { uploadVideo, validateVideoDuration } from '@/lib/mediaUpload'
import { notifyXPGain } from '@/components/XPNotifications'

export default function UploadShortPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleFileSelect = async (file: File) => {
    setError(null)

    // Validate video duration (max 60 seconds for shorts)
    const validation = await validateVideoDuration(file, 60)
    if (!validation.valid) {
      setError(validation.error || 'Video inválido')
      return
    }

    setVideoFile(file)
    const previewUrl = URL.createObjectURL(file)
    setVideoPreview(previewUrl)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoFile || uploading) return

    setUploading(true)
    setError(null)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No estás autenticado')
      }

      // Upload video to Supabase Storage
      const { data: uploadData, error: uploadError } = await uploadVideo(videoFile, user.id)
      if (uploadError) {
        throw new Error(uploadError.message)
      }

      // Create short record in database
      const { error: dbError } = await supabase.from('shorts').insert({
        author_id: user.id,
        video_url: uploadData!.url,
        title: title.trim() || null,
        description: description.trim() || null,
      })

      if (dbError) throw dbError

      // Notify XP gain (25 XP for shorts)
      notifyXPGain(25, 'Subiste un Short')

      // Redirect to shorts feed
      router.push('/shorts')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500 via-pink-600 to-purple-700">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/shorts"
            className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-white">Subir Short</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Video uploader */}
          {!videoPreview ? (
            <div className="bg-white rounded-2xl p-8">
              <label className="block">
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                  className="hidden"
                />
                <div className="border-3 border-dashed border-purple-300 rounded-xl p-12 text-center cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full">
                      <VideoIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-700 mb-1">
                        Selecciona un video
                      </p>
                      <p className="text-sm text-gray-500">
                        MP4, WebM, MOV - Máx. 60 segundos y 50MB
                      </p>
                    </div>
                  </div>
                </div>
              </label>
            </div>
          ) : (
            <>
              {/* Video preview */}
              <div className="bg-white rounded-2xl p-4">
                <video
                  src={videoPreview}
                  controls
                  className="w-full max-h-96 rounded-lg bg-black"
                />
                <button
                  type="button"
                  onClick={() => {
                    setVideoFile(null)
                    setVideoPreview(null)
                  }}
                  className="mt-4 text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Cambiar video
                </button>
              </div>

              {/* Title input */}
              <div className="bg-white rounded-2xl p-6">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 mb-2 block">
                    Título (opcional)
                  </span>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Dale un título a tu Short..."
                    maxLength={100}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-xs text-gray-500 mt-1 block">
                    {title.length}/100
                  </span>
                </label>
              </div>

              {/* Description input */}
              <div className="bg-white rounded-2xl p-6">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700 mb-2 block">
                    Descripción (opcional)
                  </span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe tu Short..."
                    maxLength={500}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  />
                  <span className="text-xs text-gray-500 mt-1 block">
                    {description.length}/500
                  </span>
                </label>
              </div>
            </>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-500 text-white rounded-lg p-4">
              {error}
            </div>
          )}

          {/* Submit button */}
          {videoFile && (
            <button
              type="submit"
              disabled={uploading}
              className="w-full py-4 bg-white text-purple-600 rounded-xl font-bold text-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-xl"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <Upload className="w-5 h-5 animate-pulse" />
                  Subiendo Short...
                </span>
              ) : (
                'Publicar Short (+25 XP)'
              )}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
