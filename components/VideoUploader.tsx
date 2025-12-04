'use client'

import { useState } from 'react'
import { Upload, X, Video as VideoIcon } from 'lucide-react'
import { uploadVideo, validateVideoDuration } from '@/lib/mediaUpload'

interface VideoUploaderProps {
  userId: string
  onVideoUploaded: (url: string) => void
  onVideoRemoved: () => void
}

export default function VideoUploader({ userId, onVideoUploaded, onVideoRemoved }: VideoUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleFileSelect = async (file: File) => {
    setError(null)

    // Validate video duration (max 3 minutes)
    const validation = await validateVideoDuration(file, 180)
    if (!validation.valid) {
      setError(validation.error || 'Video inválido')
      return
    }

    // Create preview immediately
    const previewUrl = URL.createObjectURL(file)
    setPreview(previewUrl)
    
    // Upload to Supabase
    setUploading(true)
    const { data, error: uploadError } = await uploadVideo(file, userId)
    setUploading(false)

    if (uploadError) {
      setError(uploadError.message)
      setPreview(null)
      URL.revokeObjectURL(previewUrl)
      return
    }

    if (data) {
      onVideoUploaded(data.url)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('video/')) {
      handleFileSelect(file)
    } else {
      setError('Por favor, sube un archivo de video válido')
    }
  }

  const handleRemove = () => {
    if (preview) {
      URL.revokeObjectURL(preview)
    }
    setPreview(null)
    setError(null)
    onVideoRemoved()
  }

  if (preview) {
    return (
      <div className="relative w-full rounded-lg overflow-hidden border-2 border-gray-200">
        <video
          src={preview}
          controls
          className="w-full max-h-64 object-contain bg-black"
        />
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-white text-sm font-medium">Subiendo video...</div>
          </div>
        )}
        {!uploading && (
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
            aria-label="Eliminar video"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition ${
          dragActive
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          onChange={handleInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />
        <div className="flex flex-col items-center gap-2">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full">
            {uploading ? (
              <Upload className="w-6 h-6 text-white animate-pulse" />
            ) : (
              <VideoIcon className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              {uploading ? 'Subiendo...' : 'Arrastra un video o haz click'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              MP4, WebM, MOV - Máx. 50MB y 3 min
            </p>
          </div>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
