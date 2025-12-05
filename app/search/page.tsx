import { createClient } from '@/lib/supabase/serverClient'
import SearchBar from '@/components/SearchBar'
import Link from 'next/link'
import Image from 'next/image'

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
              <Link
                key={profile.id}
                href={`/profile/${profile.id}`}
                className="block bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition group"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
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

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
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
                  </div>

                  {/* Arrow indicator */}
                  <div className="text-gray-400 group-hover:text-blue-600 transition">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
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
