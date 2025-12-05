'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/browserClient'
import type { Message } from '@/lib/types'
import Image from 'next/image'
import { Send, Loader2, ArrowLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

type ChatWindowProps = {
  conversationId: string
  currentUserId: string
}

type UserProfile = {
  id: string
  username: string
  avatar_url: string | null
  level: number
}

export default function ChatWindow({ conversationId, currentUserId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadMessages()
    loadOtherUser()
    markMessagesAsRead()

    // Subscribe to new messages with better error handling
    const channel = supabase
      .channel(`messages-${conversationId}`, {
        config: {
          broadcast: { self: false },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('✉️ New message received via Realtime:', payload)
          const newMsg = payload.new as Message
          
          // Always add message from Realtime (both sent and received)
          setMessages((prev) => {
            // Check if message already exists to avoid duplicates
            const exists = prev.some(m => m.id === newMsg.id)
            if (exists) {
              console.log('⚠️ Message already exists, skipping')
              return prev
            }
            console.log('✅ Adding message to chat')
            return [...prev, newMsg]
          })
          
          // Mark as read if it's received (not sent by current user)
          if (newMsg.sender_id !== currentUserId && newMsg.receiver_id === currentUserId) {
            console.log('📖 Marking message as read')
            markMessagesAsRead()
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Realtime subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to messages')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, currentUserId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadOtherUser = async () => {
    try {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('participant1_id, participant2_id')
        .eq('id', conversationId)
        .single()

      if (!conversation) return

      const otherUserId =
        conversation.participant1_id === currentUserId
          ? conversation.participant2_id
          : conversation.participant1_id

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, level')
        .eq('id', otherUserId)
        .single()

      setOtherUser(profile)
    } catch (error) {
      console.error('Error loading other user:', error)
    }
  }

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setMessages(data || [])
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const markMessagesAsRead = async () => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('receiver_id', currentUserId)
        .eq('is_read', false)
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || sending) return

    const messageContent = newMessage.trim()
    setSending(true)
    setNewMessage('') // Clear input immediately for better UX

    try {
      // Get conversation participants
      const { data: conversation } = await supabase
        .from('conversations')
        .select('participant1_id, participant2_id')
        .eq('id', conversationId)
        .single()

      if (!conversation) throw new Error('Conversation not found')

      const receiverId =
        conversation.participant1_id === currentUserId
          ? conversation.participant2_id
          : conversation.participant1_id

      console.log('📤 Sending message...')
      const { data: insertedMessage, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          receiver_id: receiverId,
          content: messageContent,
        })
        .select()
        .single()

      if (error) throw error

      console.log('✅ Message sent successfully:', insertedMessage)
      // Don't add to local state - let Realtime handle it
    } catch (error) {
      console.error('❌ Error sending message:', error)
      setNewMessage(messageContent) // Restore message on error
    } finally {
      setSending(false)
    }
  }

  const handleBack = () => {
    router.push('/messages')
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat header */}
      {otherUser && (
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
              {otherUser.avatar_url ? (
                <Image
                  src={otherUser.avatar_url}
                  alt={otherUser.username}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {otherUser.username[0]?.toUpperCase()}
                </div>
              )}
            </div>
            
            <div>
              <h2 className="font-semibold text-gray-900">{otherUser.username}</h2>
              <p className="text-xs text-gray-500">Nivel {otherUser.level}</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-2">👋</div>
              <p>Envía el primer mensaje</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isOwn = message.sender_id === currentUserId
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                      isOwn
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-white text-gray-900 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    <p className="break-words">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isOwn ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message input */}
      <form onSubmit={handleSendMessage} className="px-6 py-4 bg-white border-t border-gray-200">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
