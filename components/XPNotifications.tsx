'use client'

import { useEffect, useState } from 'react'
import { Zap, TrendingUp, Trophy } from 'lucide-react'

type XPNotification = {
  id: string
  amount: number
  reason: string
}

type AchievementNotification = {
  id: string
  title: string
  description: string
  icon: string
  xpReward: number
}

export default function XPNotificationContainer() {
  const [notifications, setNotifications] = useState<XPNotification[]>([])
  const [achievementNotifications, setAchievementNotifications] = useState<AchievementNotification[]>([])

  useEffect(() => {
    // Listen for XP gain events
    const handleXPGain = (event: CustomEvent<{ amount: number; reason: string }>) => {
      const notification: XPNotification = {
        id: Math.random().toString(36),
        amount: event.detail.amount,
        reason: event.detail.reason,
      }

      setNotifications((prev) => [...prev, notification])

      // Remove notification after 3 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
      }, 3000)
    }

    // Listen for achievement unlock events
    const handleAchievementUnlock = (event: CustomEvent<{
      title: string
      description: string
      icon: string
      xpReward: number
    }>) => {
      const notification: AchievementNotification = {
        id: Math.random().toString(36),
        title: event.detail.title,
        description: event.detail.description,
        icon: event.detail.icon,
        xpReward: event.detail.xpReward,
      }

      setAchievementNotifications((prev) => [...prev, notification])

      // Remove notification after 5 seconds
      setTimeout(() => {
        setAchievementNotifications((prev) => prev.filter((n) => n.id !== notification.id))
      }, 5000)
    }

    window.addEventListener('xp-gained' as any, handleXPGain)
    window.addEventListener('achievement-unlocked' as any, handleAchievementUnlock)
    
    return () => {
      window.removeEventListener('xp-gained' as any, handleXPGain)
      window.removeEventListener('achievement-unlocked' as any, handleAchievementUnlock)
    }
  }, [])

  if (notifications.length === 0 && achievementNotifications.length === 0) return null

  return (
    <>
      {/* XP Notifications */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {notifications.map((notification, index) => (
          <div
            key={notification.id}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="p-1.5 bg-white/20 rounded-full">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-lg">+{notification.amount} XP</p>
              <p className="text-sm opacity-90">{notification.reason}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Achievement Notifications */}
      {achievementNotifications.map((notification) => (
        <AchievementUnlockedModal
          key={notification.id}
          achievement={notification}
        />
      ))}
    </>
  )
}

// Helper function to trigger XP notifications from anywhere
export function notifyXPGain(amount: number, reason: string) {
  window.dispatchEvent(
    new CustomEvent('xp-gained', {
      detail: { amount, reason },
    })
  )
}

// Helper function to trigger achievement unlock notifications
export function notifyAchievementUnlock(
  title: string,
  description: string,
  icon: string,
  xpReward: number
) {
  window.dispatchEvent(
    new CustomEvent('achievement-unlocked', {
      detail: { title, description, icon, xpReward },
    })
  )
}

// Achievement unlocked modal component
function AchievementUnlockedModal({ achievement }: { achievement: AchievementNotification }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in">
      <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-yellow-600 text-white p-8 rounded-2xl shadow-2xl text-center max-w-md animate-scale-in mx-4">
        {/* Trophy icon */}
        <div className="mb-4 relative">
          <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Trophy className="w-10 h-10" />
          </div>
          {/* Achievement icon overlay */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 text-4xl">
            {achievement.icon}
          </div>
        </div>

        <h2 className="text-3xl font-bold mb-2">¡LOGRO DESBLOQUEADO!</h2>
        <h3 className="text-2xl font-semibold mb-3">{achievement.title}</h3>
        <p className="text-lg opacity-90 mb-4">{achievement.description}</p>

        {/* XP Reward badge */}
        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
          <Zap className="w-5 h-5" />
          <span className="font-bold text-lg">+{achievement.xpReward} XP</span>
        </div>

        <p className="text-sm opacity-75 mt-4">¡Sigue así para desbloquear más logros!</p>
      </div>
    </div>
  )
}

// Level up notification component
export function LevelUpNotification({ level }: { level: number }) {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white p-8 rounded-2xl shadow-2xl text-center max-w-md animate-scale-in">
        <div className="mb-4">
          <TrendingUp className="w-16 h-16 mx-auto" />
        </div>
        <h2 className="text-4xl font-bold mb-2">¡NIVEL {level}!</h2>
        <p className="text-lg opacity-90">¡Has subido de nivel!</p>
        <p className="text-sm opacity-75 mt-2">Sigue así para desbloquear más logros</p>
      </div>
    </div>
  )
}
