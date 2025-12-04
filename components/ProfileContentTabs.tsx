'use client'

import { useState } from 'react'
import { FileText, Zap } from 'lucide-react'
import PostCard from './PostCard'
import type { Post, Short } from '@/lib/types'
import Link from 'next/link'

interface ProfileContentTabsProps {
  posts: Post[]
  shorts: Short[]
  postsCount: number
  shortsCount: number
  currentUserId?: string
  isOwnProfile: boolean
}

export default function ProfileContentTabs({
  posts,
  shorts,
  postsCount,
  shortsCount,
  currentUserId,
  isOwnProfile,
}: ProfileContentTabsProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'shorts'>('posts')

  return (
    <div>
      {/* Tabs Navigation */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === 'posts'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span>Publicaciones</span>
          <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
            {postsCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('shorts')}
          className={`flex items-center gap-2 px-4 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === 'shorts'
              ? 'text-purple-600 border-purple-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <Zap className="w-5 h-5" />
          <span>Shorts</span>
          <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">
            {shortsCount}
          </span>
        </button>
      </div>

      {/* Posts Tab Content */}
      {activeTab === 'posts' && (
        <div>
          {posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium mb-2">
                {isOwnProfile
                  ? 'Aún no has publicado nada'
                  : 'Este usuario aún no ha publicado nada'}
              </p>
              <p className="text-gray-400 text-sm">
                {isOwnProfile && '¡Comparte tu primer post!'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} currentUserId={currentUserId} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shorts Tab Content */}
      {activeTab === 'shorts' && (
        <div>
          {shorts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium mb-2">
                {isOwnProfile
                  ? 'Aún no has subido ningún Short'
                  : 'Este usuario aún no ha subido ningún Short'}
              </p>
              <p className="text-gray-400 text-sm mb-4">
                {isOwnProfile && '¡Sube tu primer video vertical!'}
              </p>
              {isOwnProfile && (
                <Link
                  href="/shorts/upload"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-full font-semibold hover:from-purple-600 hover:to-pink-700 transition-all"
                >
                  <Zap className="w-5 h-5" />
                  Subir Short
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {shorts.map((short) => (
                <Link
                  key={short.id}
                  href={`/shorts?id=${short.id}`}
                  className="relative aspect-[9/16] rounded-lg overflow-hidden bg-black group cursor-pointer"
                >
                  {/* Video thumbnail */}
                  <video
                    src={short.video_url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                  
                  {/* Overlay with info */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Stats */}
                  <div className="absolute bottom-2 left-2 right-2 text-white text-sm">
                    <p className="font-semibold line-clamp-2 mb-1 drop-shadow-lg">
                      {short.title || 'Short sin título'}
                    </p>
                    <div className="flex items-center gap-3 text-xs">
                      <span>❤️ {short.likes_count}</span>
                      <span>💬 {short.comments_count}</span>
                      <span>👁️ {short.views_count}</span>
                    </div>
                  </div>

                  {/* Play icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                      <Zap className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
