import { createClient } from '@/lib/supabase/serverClient'
import PostCard from '@/components/PostCard'
import CreatePostForm from '@/components/CreatePostForm'
import type { Post } from '@/lib/types'
import { CheckCircle } from 'lucide-react'

type PageProps = {
  searchParams: Promise<{ confirmed?: string }>
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: postsData, error } = await supabase
    .from('posts')
    .select(`
      id,
      content,
      created_at,
      likes_count,
      media_url,
      profiles!posts_author_id_fkey (
        id,
        username,
        avatar_url,
        level
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20)

  // Transform the data to match our Post type (profiles is returned as array, we need object)
  const posts = postsData?.map((post: any) => ({
    ...post,
    profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
  })) as Post[] | null

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

        <div className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg">
              Error al cargar posts: {error.message}
            </div>
          )}
          
          {posts && posts.length === 0 && (
            <div className="p-8 bg-white rounded-lg shadow-sm text-center text-gray-500">
              No hay posts aún. ¡Sé el primero en publicar!
            </div>
          )}
          
          {posts?.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={user?.id} />
          ))}
        </div>
      </div>
    </main>
  )
}
