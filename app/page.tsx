import { createClient } from '@/lib/supabase/serverClient'
import PostCard from '@/components/PostCard'
import CreatePostForm from '@/components/CreatePostForm'
import FeedTabs from '@/components/FeedTabs'
import type { Post } from '@/lib/types'
import { CheckCircle } from 'lucide-react'

type PageProps = {
  searchParams: Promise<{ confirmed?: string }>
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  let forYouPosts: Post[] = []
  let followingPosts: Post[] = []
  let postsData: Post[] | null = null
  let error = null
  
  if (user) {
    // Get "For You" feed using recommendation algorithm
    const { data: recommendedPostIds } = await supabase
      .rpc('calculate_personalized_posts_feed', {
        target_user_id: user.id,
        limit_count: 30
      })

    if (recommendedPostIds && recommendedPostIds.length > 0) {
      const postIds = recommendedPostIds.map((item: any) => item.post_id)
      
      const { data: forYouData } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          likes_count,
          comments_count,
          media_url,
          media_type,
          author_id,
          profiles!posts_author_id_fkey (
            id,
            username,
            avatar_url,
            level
          )
        `)
        .in('id', postIds)

      forYouPosts = forYouData?.map((post: any) => ({
        ...post,
        profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
      })) || []

      // Sort by recommendation score
      const scoreMap = new Map(recommendedPostIds.map((item: any) => [item.post_id, item.final_score]))
      forYouPosts.sort((a, b) => (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0))
    }

    // Get "Following" feed
    const { data: followsData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = followsData?.map(f => f.following_id) || []
    
    if (followingIds.length > 0) {
      const authorIds = [user.id, ...followingIds]
      
      const { data: followingData } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          likes_count,
          comments_count,
          media_url,
          media_type,
          author_id,
          profiles!posts_author_id_fkey (
            id,
            username,
            avatar_url,
            level
          )
        `)
        .in('author_id', authorIds)
        .order('created_at', { ascending: false })
        .limit(30)

      followingPosts = followingData?.map((post: any) => ({
        ...post,
        profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
      })) || []
    }

    // If forYouPosts is empty, fallback to recent posts
    if (forYouPosts.length === 0) {
      const { data: recentData } = await supabase
        .from('posts')
        .select(`
          id,
          content,
          created_at,
          likes_count,
          comments_count,
          media_url,
          media_type,
          author_id,
          profiles!posts_author_id_fkey (
            id,
            username,
            avatar_url,
            level
          )
        `)
        .neq('author_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)

      forYouPosts = recentData?.map((post: any) => ({
        ...post,
        profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
      })) || []
    }
  } else {
    // Show all posts for non-authenticated users
    const { data, error: fetchError } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        created_at,
        likes_count,
        comments_count,
        media_url,
        media_type,
        profiles!posts_author_id_fkey (
          id,
          username,
          avatar_url,
          level
        )
      `)
      .order('created_at', { ascending: false })
      .limit(30)

    postsData = data?.map((post: any) => ({
      ...post,
      profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
    })) as Post[] | null
    
    error = fetchError
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {!user && (
          <header className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Bienvenido a LEVELY</h1>
            <p className="text-gray-600">Tu red social con niveles</p>
          </header>
        )}

        {/* Mensaje de confirmación exitosa */}
        {params.confirmed === 'true' && user && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-semibold">¡Cuenta confirmada exitosamente!</p>
              <p className="text-sm">Bienvenido a LEVELY. Ya puedes comenzar a publicar contenido.</p>
            </div>
          </div>
        )}

        {user && (
          <div className="mb-8">
            <CreatePostForm userId={user.id} />
          </div>
        )}

        {!user && (
          <div className="mb-8 p-6 bg-white rounded-lg shadow-sm text-center">
            <p className="text-gray-600 mb-4">Inicia sesión para publicar contenido</p>
            <a 
              href="/login" 
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Iniciar Sesión
            </a>
          </div>
        )}

        {user ? (
          <FeedTabs 
            forYouPosts={forYouPosts}
            followingPosts={followingPosts}
            currentUserId={user.id}
          />
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg">
                Error al cargar posts: {error.message}
              </div>
            )}
            
            {postsData && postsData.length === 0 && (
              <div className="p-8 bg-white rounded-lg shadow-sm text-center text-gray-500">
                No hay posts aún. ¡Sé el primero en publicar!
              </div>
            )}
            
            {postsData?.map((post) => (
              <PostCard key={post.id} post={post} currentUserId={user?.id} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
