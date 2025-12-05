'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browserClient'
import Image from 'next/image'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { useState } from 'react'

type UserSearchCardProps = {
  profile: {
    id: string
    username: string
    avatar_url: string | null
    level: number
    bio: string | null
  }
  currentUserId?: string
}

export default function UserSearchCard({ profile, currentUserId }: UserSearchCardProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleSendMessage = async (e: React.MouseEvent) => {
    e.preventDefault() // Prevent Link navigation
    e.stopPropagation()
    
    if (!currentUserId) {
      router.push('/login')
      return
    }

    setLoading(true)
    try {
      // Get or create conversation
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        user1_id: profile.id,
        user2_id: currentUserId,
      })

      if (error) throw error

      // Redirect to messages with conversation
      router.push(`/messages?chat=${data}`)
    } catch (error) {
      console.error('Error creating conversation:', error)
      setLoading(false)
    }
  }

  const isOwnProfile = currentUserId === profile.id

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition group">
      <div className="flex items-center gap-4">
        {/* Avatar - clickable to profile */}
        <Link href={`/profile/${profile.id}`} className="flex-shrink-0">
          <div className="w-16 h-16 rounded-full overflow-hidden">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.username}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                {profile.username[0]?.toUpperCase()}
              </div>
            )}
          </div>
        </Link>

        {/* User Info - clickable to profile */}
        <Link href={`/profile/${profile.id}`} className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition truncate">
              {profile.username}
            </h3>
            <span className="px-2 py-0.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs rounded-full font-semibold flex-shrink-0">
              Nv. {profile.level}
            </span>
          </div>
          {profile.bio && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {profile.bio}
            </p>
          )}
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!isOwnProfile && currentUserId && (
            <button
              onClick={handleSendMessage}
              disabled={loading}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              title="Enviar mensaje"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <MessageCircle className="w-5 h-5" />
              )}
            </button>
          )}
          
          <Link
            href={`/profile/${profile.id}`}
            className="p-2 text-gray-400 group-hover:text-blue-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
