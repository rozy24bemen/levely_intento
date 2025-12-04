'use client'

import { useState, useRef } from 'react'
import { Edit2, Check, X, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/browserClient'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import AvatarCropModal from './AvatarCropModal'

type Profile = {
  id: string
  username: string
  bio: string | null
  avatar_url: string | null
  level: number
  xp: number
  created_at: string
}

type ProfileHeaderProps = {
  profile: Profile
  isOwnProfile: boolean
  currentUserId?: string
}

export default function ProfileHeader({ profile, isOwnProfile }: ProfileHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState(profile.username)
  const [bio, setBio] = useState(profile.bio || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  const handleAvatarClick = () => {
    if (isOwnProfile && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar los 5MB')
      return
    }

    // Create preview URL and show crop modal
    const imageUrl = URL.createObjectURL(file)
    setSelectedImageUrl(imageUrl)
    setShowCropModal(true)
  }

  const handleSaveCroppedImage = async (croppedBlob: Blob) => {
    setShowCropModal(false)
    setUploadingAvatar(true)
    setError(null)

    try {
      // Upload to Supabase Storage
      const fileName = `${profile.id}-${Date.now()}.jpg`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedBlob, {
          contentType: 'image/jpeg',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al subir la imagen')
    } finally {
      setUploadingAvatar(false)
      if (selectedImageUrl) {
        URL.revokeObjectURL(selectedImageUrl)
        setSelectedImageUrl(null)
      }
    }
  }

  const handleCancelCrop = () => {
    setShowCropModal(false)
    if (selectedImageUrl) {
      URL.revokeObjectURL(selectedImageUrl)
      setSelectedImageUrl(null)
    }
  }

  const handleSave = async () => {
    if (!username.trim() || username.length < 3) {
      setError('El nombre de usuario debe tener al menos 3 caracteres')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          bio: bio.trim() || null,
        })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setIsEditing(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message === 'duplicate key value violates unique constraint "profiles_username_key"'
        ? 'Este nombre de usuario ya está en uso'
        : err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setUsername(profile.username)
    setBio(profile.bio || '')
    setError(null)
    setIsEditing(false)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-start gap-6">
        {/* Avatar */}
        <div className="relative group">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <button
            onClick={handleAvatarClick}
            disabled={!isOwnProfile || uploadingAvatar}
            className={`w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl flex-shrink-0 overflow-hidden relative ${
              isOwnProfile && !uploadingAvatar ? 'cursor-pointer' : 'cursor-default'
            } ${uploadingAvatar ? 'opacity-50' : ''}`}
          >
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.username}
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                {profile.username[0]?.toUpperCase()}
              </div>
            )}
            {isOwnProfile && !uploadingAvatar && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-8 h-8 text-white" />
              </div>
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>
        </div>

        {/* Profile Info */}
        <div className="flex-1">
          {!isEditing ? (
            <>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{profile.username}</h1>
                <span className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm rounded-full font-semibold">
                  Nivel {profile.level}
                </span>
                {isOwnProfile && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="ml-auto p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    title="Editar perfil"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              {profile.bio && (
                <p className="text-gray-700 mb-3">{profile.bio}</p>
              )}
              <p className="text-sm text-gray-500">
                Miembro desde {new Date(profile.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                })}
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de usuario
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={30}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                  Biografía
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={200}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Cuéntanos sobre ti..."
                />
                <p className="text-xs text-gray-500 mt-1">{bio.length}/200 caracteres</p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  <Check className="w-4 h-4" />
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Crop Modal */}
      {showCropModal && selectedImageUrl && (
        <AvatarCropModal
          imageUrl={selectedImageUrl}
          onSave={handleSaveCroppedImage}
          onCancel={handleCancelCrop}
        />
      )}
    </div>
  )
}
