import { createClient } from '@/lib/supabase/serverClient'
import ShortsContainer from '@/components/ShortsContainer'
import type { Short } from '@/lib/types'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function ShortsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: shortsData, error } = await supabase
    .from('shorts')
    .select(`
      id,
      author_id,
      video_url,
      thumbnail_url,
      title,
      description,
      likes_count,
      comments_count,
      views_count,
      created_at,
      profiles!shorts_author_id_fkey (
        id,
        username,
        avatar_url,
        level
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  // Transform the data to match our Short type
  const shorts = shortsData?.map((short: any) => ({
    ...short,
    profiles: Array.isArray(short.profiles) ? short.profiles[0] : short.profiles
  })) as Short[] | null

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-600">
        <div className="text-center text-white p-8">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold mb-4">Inicia sesión para ver Shorts</h1>
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Back button */}
      <Link
        href="/"
        className="fixed top-4 left-4 z-50 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all"
      >
        <ArrowLeft className="w-6 h-6" />
      </Link>

      {/* Upload button */}
      <Link
        href="/shorts/upload"
        className="fixed top-4 right-4 z-50 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-full font-semibold hover:from-purple-600 hover:to-pink-700 transition-all shadow-lg"
      >
        + Subir Short
      </Link>

      {/* Shorts container */}
      <ShortsContainer 
        initialShorts={shorts || []} 
        currentUserId={user.id}
      />
    </div>
  )
}
