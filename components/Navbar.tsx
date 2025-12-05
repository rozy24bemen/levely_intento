'use client'

import { createClient } from '@/lib/supabase/browserClient'
import { useRouter, usePathname } from 'next/navigation'
import { LogOut, Home, User, Zap, Search } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

type NavbarProps = {
  user: {
    id: string
    email?: string
  } | null
  profile?: {
    username: string
    level: number
    avatar_url: string | null
  } | null
}

export default function Navbar({ user, profile }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Hide navbar on Shorts page
  if (pathname === '/shorts') {
    return null
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">L</span>
            </div>
            <span className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition">
              LEVELY
            </span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {/* Home Link */}
                <Link
                  href="/"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                  title="Inicio"
                >
                  <Home className="w-5 h-5" />
                  <span className="hidden sm:inline">Inicio</span>
                </Link>

                {/* Search Link */}
                <Link
                  href="/search"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                  title="Buscar Usuarios"
                >
                  <Search className="w-5 h-5" />
                  <span className="hidden sm:inline">Buscar</span>
                </Link>

                {/* Shorts Link */}
                <Link
                  href="/shorts"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-600 transition"
                  title="Shorts"
                >
                  <Zap className="w-5 h-5" />
                  <span className="hidden sm:inline">Shorts</span>
                </Link>

                {/* Profile Link */}
                <Link
                  href={`/profile/${user.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                  title="Mi Perfil"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden sm:inline">Perfil</span>
                </Link>

                {/* User Info */}
                {profile && (
                  <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      {profile.avatar_url ? (
                        <Image
                          src={profile.avatar_url}
                          alt={profile.username}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {profile.username[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="hidden md:block">
                      <p className="text-sm font-semibold text-gray-900">
                        {profile.username}
                      </p>
                      <p className="text-xs text-gray-500">Nivel {profile.level}</p>
                    </div>
                  </div>
                )}

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/login"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
