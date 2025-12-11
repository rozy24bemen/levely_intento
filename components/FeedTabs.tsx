'use client'

import { useState } from 'react'
import PostCard from './PostCard'
import type { Post } from '@/lib/types'
import { Sparkles, Users } from 'lucide-react'

type FeedTab = 'foryou' | 'following'

interface FeedTabsProps {
  forYouPosts: Post[]
  followingPosts: Post[]
  currentUserId?: string
}

export default function FeedTabs({ forYouPosts, followingPosts, currentUserId }: FeedTabsProps) {
  const [activeTab, setActiveTab] = useState<FeedTab>('foryou')

  const displayPosts = activeTab === 'foryou' ? forYouPosts : followingPosts

  return (
    <div>
      {/* Tabs Header */}
      <div className="bg-white rounded-lg shadow-sm mb-6 p-1 flex gap-2">
        <button
          onClick={() => setActiveTab('foryou')}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'foryou'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          Para Ti
        </button>
        <button
          onClick={() => setActiveTab('following')}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'following'
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Users className="w-5 h-5" />
          Siguiendo
        </button>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {displayPosts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">
              {activeTab === 'foryou' ? '✨' : '👥'}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {activeTab === 'foryou' ? 'No hay contenido aún' : 'No sigues a nadie'}
            </h3>
            <p className="text-gray-600">
              {activeTab === 'foryou'
                ? 'Interactúa con posts para que podamos recomendarte contenido personalizado.'
                : 'Busca usuarios interesantes y síguelos para ver su contenido aquí.'}
            </p>
          </div>
        ) : (
          displayPosts.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={currentUserId} />
          ))
        )}
      </div>

      {/* Loading indicator for infinite scroll (future feature) */}
      {displayPosts.length > 0 && (
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Has visto todo por ahora. Vuelve más tarde para más contenido.</p>
        </div>
      )}
    </div>
  )
}
