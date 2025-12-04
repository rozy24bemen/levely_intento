'use client'

import { useState, useRef, DragEvent } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'
import { uploadImage, validateImageDimensions } from '@/lib/imageUpload'

interface ImageUploaderProps {
  userId: string
  onImageUploaded: (url: string) => void
  onImageRemoved: () => void
  initialImage?: string | null
}

export default function ImageUploader({
  userId,
  onImageUploaded,
  onImageRemoved,
  initialImage = null,
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(initialImage)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    setError(null)

    // Validate dimensions
    const dimensionCheck = await validateImageDimensions(file)
    if (!dimensionCheck.valid) {
      setError(dimensionCheck.error || 'Imagen inválida')
      return
    }

    // Show preview immediately
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload to Supabase
    setUploading(true)
    const { data, error: uploadError } = await uploadImage(file, userId)
    setUploading(false)

    if (uploadError) {
      setError(uploadError.message)
      setPreview(null)
      return
    }

    if (data) {
      onImageUploaded(data.url)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file)
    } else {
      setError('Por favor, arrastra una imagen válida')
    }
  }

  const handleRemove = () => {
    setPreview(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onImageRemoved()
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="w-full">
      {preview ? (
        // Image preview
        <div className="relative w-full rounded-lg overflow-hidden border-2 border-gray-200">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-auto max-h-96 object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-white px-4 py-2 rounded-lg">
                <p className="text-sm font-medium">Subiendo imagen...</p>
              </div>
            </div>
          )}
          <button
            onClick={handleRemove}
            disabled={uploading}
            className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition disabled:opacity-50"
            title="Eliminar imagen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        // Upload area
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-2">
            {uploading ? (
              <>
                <Upload className="w-12 h-12 text-blue-500 animate-bounce" />
                <p className="text-sm font-medium text-gray-700">Subiendo imagen...</p>
              </>
            ) : (
              <>
                <ImageIcon className="w-12 h-12 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Haz clic o arrastra una imagen aquí
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG, WebP o GIF (máx. 5MB)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}
