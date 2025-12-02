'use client'

import AchievementCard, { type Achievement } from './AchievementCard'
import { Trophy } from 'lucide-react'

interface AchievementsGridProps {
  achievements: Achievement[]
  unlockedCount: number
  totalCount: number
}

export default function AchievementsGrid({ 
  achievements, 
  unlockedCount, 
  totalCount 
}: AchievementsGridProps) {
  const progressPercentage = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Logros</h2>
            <p className="text-sm text-gray-500">
              {unlockedCount} de {totalCount} desbloqueados
            </p>
          </div>
        </div>
        
        {/* Percentage badge */}
        <div className="px-4 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full">
          <span className="text-lg font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
            {Math.round(progressPercentage)}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-600 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Achievements grid */}
      {achievements.length === 0 ? (
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay logros disponibles aún</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </div>
      )}
    </div>
  )
}
