import { createClient } from '@/lib/supabase/serverClient'
import SearchBar from '@/components/SearchBar'
import UserSearchCard from '@/components/UserSearchCard'
import Link from 'next/link'

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q || ''
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Search users if query exists
  let users = null
  if (query.trim().length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, level, bio')
      .ilike('username', `%${query}%`)
      .order('level', { ascending: false })
      .limit(20)
    
    users = data
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Buscar Usuarios</h1>
          <p className="text-gray-600">Encuentra personas increíbles en LEVELY</p>
        </header>

        {/* Search Bar */}
        <div className="mb-8">
          <SearchBar initialQuery={query} />
        </div>

        {/* Results */}
        {query.trim().length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-500">Escribe algo para buscar usuarios</p>
          </div>
        ) : users && users.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">
              {users.length} resultado{users.length !== 1 ? 's' : ''} para "{query}"
            </p>
            {users.map((profile) => (
              <UserSearchCard 
                key={profile.id} 
                profile={profile}
                currentUserId={user?.id}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">😔</div>
            <p className="text-gray-500 mb-2">No se encontraron usuarios</p>
            <p className="text-sm text-gray-400">Intenta con otra búsqueda</p>
          </div>
        )}

        {/* Login message if not authenticated */}
        {!user && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-blue-800 mb-3">¿Quieres conectar con otros usuarios?</p>
            <Link
              href="/login"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Iniciar Sesión
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
