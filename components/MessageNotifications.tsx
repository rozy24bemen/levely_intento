'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/browserClient'
import { usePathname } from 'next/navigation'

type MessageNotificationsProps = {
  userId: string
}

export default function MessageNotifications({ userId }: MessageNotificationsProps) {
  const supabase = createClient()
  const pathname = usePathname()

  useEffect(() => {
    // Don't show notifications if already on messages page
    if (pathname?.startsWith('/messages')) return

    const channel = supabase
      .channel('message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          const newMessage = payload.new as any

          // Get sender info
          const { data: sender } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', newMessage.sender_id)
            .single()

          if (sender) {
            // Show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`Nuevo mensaje de ${sender.username}`, {
                body: newMessage.content,
                icon: sender.avatar_url || '/default-avatar.png',
                tag: newMessage.conversation_id,
              })
            }

            // Show in-app notification
            showInAppNotification(sender.username, newMessage.content)
          }
        }
      )
      .subscribe()

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, pathname])

  const showInAppNotification = (username: string, content: string) => {
    const notification = document.createElement('div')
    notification.className = 'fixed top-20 right-4 z-50 bg-white shadow-lg rounded-lg p-4 border border-gray-200 animate-slide-in max-w-sm'
    notification.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-gray-900">${username}</p>
          <p class="text-sm text-gray-600 truncate">${content}</p>
        </div>
        <button class="flex-shrink-0 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `
    document.body.appendChild(notification)

    // Play notification sound
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57eeVSwkOUKXh8LZoHgU5j9Xxy3csAyd9yO7bj0QKEly06O2sWRUJRp7f8r1tIQQsgM7y2Yk2CBhjtOzmlEoJDU+k4fC2aB4FOY7V8cpzKwIofMns2o5EChFauejtrFoVCUae3vK+bSAEK3/O8diJNggYYrPr5ZNJCAxOpOLwtmkfBTmO1fHKciwCJ3vI7NqORQoQWLno7axaFQlGnt7yvm0gBCt/zvHYiTYIGWG06+WSRwgMTqPi8LZpHwU5jtXxynIsAid6x+zahkUKD1e56O2sWhYJRZ7e8r5tIAQrf87x2Ik2CBlhtOvlkkUIDE2k4vC2aR8FOI/U8cpzKwInecjt2oVFChBXuejtrFoWCUSe3vK+bSAEK3/O8diJNggZYbTr5ZJFCAxNpOLwtmkfBTiP1fHKciwCJ3nI7dqFRQoPV7vo7axaFglEnt7yvm0gBCt/zvHYiTYIGWGz6+WRRQgMTaTi8LVpHwU4j9XxynIsAid5yO7ahkUKD1e56O2sWhYJRJ7e8r5tIAQrf87x14k2CBlgs+vkkkUIDE2k4vC2aR8FOI/V8cpzKwInecju2oVFCg9Xuujt');
    audio.volume = 0.3
    audio.play().catch(() => {})

    // Auto remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'slide-out 0.3s ease-out'
      setTimeout(() => notification.remove(), 300)
    }, 5000)
  }

  return null
}
