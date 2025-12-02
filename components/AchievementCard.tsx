'use client'

import { Trophy, Lock } from 'lucide-react'

export interface Achievement {
  id: string
  slug: string
  title: string
  description: string | null
  xp_reward: number
  icon: string | null
  trigger_type: string
  trigger_value: number | null
  unlocked?: boolean
  awarded_at?: string
}

export default function AchievementCard({ achievement }: { achievement: Achievement }) {
  const isUnlocked = achievement.unlocked || false

  return (
    <div
      className={`relative rounded-lg p-4 border-2 transition-all ${
        isUnlocked
          ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300 shadow-md hover:shadow-lg'
          : 'bg-gray-50 border-gray-200 opacity-60'
      }`}
    >
      {/* Lock overlay for locked achievements */}
      {!isUnlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 rounded-lg">
          <Lock className="w-8 h-8 text-gray-400" />
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
            isUnlocked
              ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
              : 'bg-gray-300'
          }`}
        >
          {achievement.icon || '🏆'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`font-semibold ${
                isUnlocked ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              {achievement.title}
            </h3>
            {isUnlocked && (
              <Trophy className="w-4 h-4 text-yellow-600 flex-shrink-0" />
            )}
          </div>

          <p
            className={`text-sm mt-1 ${
              isUnlocked ? 'text-gray-600' : 'text-gray-400'
            }`}
          >
            {achievement.description || 'Logro secreto'}
          </p>

          {/* XP Reward */}
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                isUnlocked
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              <span className="text-sm">⚡</span>
              +{achievement.xp_reward} XP
            </span>

            {/* Awarded date */}
            {isUnlocked && achievement.awarded_at && (
              <span className="text-xs text-gray-500">
                {new Date(achievement.awarded_at).toLocaleDateString('es-ES', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
