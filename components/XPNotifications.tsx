'use client'

import { useEffect, useState } from 'react'
import { Zap, TrendingUp } from 'lucide-react'

type XPNotification = {
  id: string
  amount: number
  reason: string
}

export default function XPNotificationContainer() {
  const [notifications, setNotifications] = useState<XPNotification[]>([])

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

    window.addEventListener('xp-gained' as any, handleXPGain)
    return () => window.removeEventListener('xp-gained' as any, handleXPGain)
  }, [])

  if (notifications.length === 0) return null

  return (
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
