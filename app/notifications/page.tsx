'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browserClient'
import { Bell, Star, MessageCircle, Heart, UserPlus, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type Notification = {
  id: string
  user_id: string
  type: 'xp_gained' | 'message' | 'like' | 'comment' | 'follow' | 'level_up'
  title: string
  message: string
  is_read: boolean
  created_at: string
  metadata?: {
    xp_amount?: number
    xp_gained?: number
    new_level?: number
    old_level?: number
    from_user?: string
    from_user_id?: string
    from_user_avatar?: string
    post_id?: string
    post_preview?: string
    post_media?: string
    conversation_id?: string
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadNotifications()
    subscribeToNotifications()
    
    // Marcar todas como leídas automáticamente al entrar
    const markAllAsReadOnLoad = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
    }
    
    markAllAsReadOnLoad()
  }, [])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Marcar todas las notificaciones como leídas en el estado local
      const readNotifications = (data || []).map(n => ({ ...n, is_read: true }))
      setNotifications(readNotifications)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel('notifications-page')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'xp_gained':
      case 'level_up':
        return <Star className="w-6 h-6 text-yellow-500" />
      case 'message':
        return <MessageCircle className="w-6 h-6 text-blue-500" />
      case 'like':
        return <Heart className="w-6 h-6 text-red-500" />
      case 'comment':
        return <MessageCircle className="w-6 h-6 text-purple-500" />
      case 'follow':
        return <UserPlus className="w-6 h-6 text-green-500" />
      default:
        return <Bell className="w-6 h-6 text-gray-500" />
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    await markAsRead(notification.id)

    if (notification.type === 'like' || notification.type === 'comment') {
      if (notification.metadata?.post_id) {
        router.push(`/post/${notification.metadata.post_id}`)
      }
    } else if (notification.type === 'message') {
      router.push('/messages')
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notificaciones</h1>
          <p className="text-gray-600">
            Todas tus notificaciones
          </p>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg">
              No tienes notificaciones
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition hover:shadow-md ${
                  !notification.is_read ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      !notification.is_read ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      {getIcon(notification.type)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {notification.title}
                        </h3>
                        <p className="text-gray-600 mt-1">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <span className="flex-shrink-0 w-3 h-3 bg-blue-600 rounded-full"></span>
                      )}
                    </div>

                    {/* XP Badge */}
                    {notification.type === 'xp_gained' && notification.metadata?.xp_amount && (
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-yellow-100 text-yellow-700 rounded-lg font-semibold">
                        <Star className="w-4 h-4" />
                        +{notification.metadata.xp_amount} XP
                      </div>
                    )}

                    {/* Level Up Badge */}
                    {notification.type === 'level_up' && (
                      <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 rounded-lg font-semibold">
                        <Star className="w-4 h-4" />
                        Nivel {notification.metadata?.new_level}
                      </div>
                    )}

                    {/* Like/Comment Notification with User and Post */}
                    {(notification.type === 'like' || notification.type === 'comment') && (
                      <div className="mt-4 space-y-3">
                        {/* XP Badge if included */}
                        {notification.metadata?.xp_gained && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-xs font-bold shadow-sm">
                            <Star className="w-3 h-3" />
                            +{notification.metadata.xp_gained} XP
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4">
                          {/* User Info */}
                          {notification.metadata?.from_user_id && (
                            <Link
                              href={`/profile/${notification.metadata.from_user_id}`}
                              className="flex items-center gap-2 hover:bg-gray-100 rounded-lg p-2 transition"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                                {notification.metadata.from_user_avatar ? (
                                  <Image
                                    src={notification.metadata.from_user_avatar}
                                    alt={notification.metadata.from_user || 'Usuario'}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-500 font-semibold">
                                    {notification.metadata.from_user?.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <span className="font-medium text-gray-900 hover:text-blue-600">
                                @{notification.metadata.from_user}
                              </span>
                            </Link>
                          )}

                          {/* Post Preview */}
                          {notification.metadata?.post_id && (
                            <button
                              onClick={() => handleNotificationClick(notification)}
                              className="flex-1 flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition text-left"
                            >
                              {notification.metadata.post_media && (
                                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                                  <Image
                                    src={notification.metadata.post_media}
                                    alt="Post"
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-600 line-clamp-2">
                                  {notification.metadata.post_preview || 'Ver publicación'}
                                </p>
                                <span className="text-xs text-blue-600 font-medium mt-1 inline-block">
                                  Ver publicación →
                                </span>
                              </div>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-sm text-gray-500 mt-3" suppressHydrationWarning>
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
