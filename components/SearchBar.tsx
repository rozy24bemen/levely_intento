'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'

type SearchBarProps = {
  initialQuery?: string
}

export default function SearchBar({ initialQuery = '' }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length > 0) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`)
      } else if (searchParams.get('q')) {
        router.push('/search')
      }
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [query, router, searchParams])

  const handleClear = () => {
    setQuery('')
    router.push('/search')
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar usuarios por nombre..."
          className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
          autoFocus
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
            title="Limpiar búsqueda"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {/* Loading indicator */}
      {query && query.trim().length > 0 && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}
    </div>
  )
}
