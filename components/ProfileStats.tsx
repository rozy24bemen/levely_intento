import { FileText, Heart, Trophy, Zap } from 'lucide-react'

type ProfileStatsProps = {
  postsCount: number
  likesCount: number
  achievementsCount: number
  level: number
  xp: number
}

export default function ProfileStats({
  postsCount,
  likesCount,
  achievementsCount,
  level,
  xp,
}: ProfileStatsProps) {
  // Calcular XP necesario para el siguiente nivel (fórmula simple)
  const xpForNextLevel = level * 100
  const xpProgress = (xp % xpForNextLevel) / xpForNextLevel * 100

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      {/* XP Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700">
              {xp} / {xpForNextLevel} XP
            </span>
          </div>
          <span className="text-sm text-gray-500">
            Siguiente nivel: {level + 1}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Posts */}
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{postsCount}</p>
            <p className="text-sm text-gray-600">Posts</p>
          </div>
        </div>

        {/* Likes */}
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
          <div className="p-2 bg-red-100 rounded-lg">
            <Heart className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{likesCount}</p>
            <p className="text-sm text-gray-600">Likes</p>
          </div>
        </div>

        {/* Achievements */}
        <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg col-span-2 md:col-span-1">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Trophy className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{achievementsCount}</p>
            <p className="text-sm text-gray-600">Logros</p>
          </div>
        </div>
      </div>
    </div>
  )
}
