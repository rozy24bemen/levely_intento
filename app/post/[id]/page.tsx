import { createClient } from '@/lib/supabase/serverClient'
import { redirect } from 'next/navigation'
import PostCard from '@/components/PostCard'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function PostPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get post with author info
  const { data: postData, error } = await supabase
    .from('posts')
    .select(`
      *,
      profiles!posts_author_id_fkey (
        id,
        username,
        avatar_url,
        level
      )
    `)
    .eq('id', id)
    .single()

  if (error || !postData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Publicación no encontrada</h1>
          <p className="text-gray-600">Esta publicación no existe o fue eliminada</p>
        </div>
      </div>
    )
  }

  // Transform the profiles array to single object
  const post = {
    ...postData,
    profiles: Array.isArray(postData.profiles) ? postData.profiles[0] : postData.profiles
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <PostCard
          post={post}
          currentUserId={user.id}
        />
      </div>
    </div>
  )
}
