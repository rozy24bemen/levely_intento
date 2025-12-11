'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/browserClient'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, MessageCircle } from 'lucide-react'

type ConversationsListProps = {
  currentUserId: string
  selectedConversationId: string | null
}

type UserProfile = {
  id: string
  username: string
  avatar_url: string | null
  level: number
}

type Message = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

type Conversation = {
  id: string
  participant1_id: string
  participant2_id: string
  last_message_at: string
  created_at: string
  other_user?: UserProfile
  last_message?: Message
  unread_count?: number
}

// Extended conversation type to support group conversations in the same list
type GroupConversation = {
  id: string
  is_group?: true
  group_id?: string
  name?: string | null
  members?: UserProfile[]
  last_message?: Message | any
  unread_count?: number
}

export default function ConversationsList({ currentUserId, selectedConversationId }: ConversationsListProps) {
  const [conversations, setConversations] = useState<Array<Conversation | GroupConversation>>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadConversations()

    // Subscribe to new messages to update conversations list
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          loadConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        () => {
          loadConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
        },
        () => {
          loadConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'groups',
        },
        () => {
          loadConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_members',
        },
        () => {
          loadConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId])

  const loadConversations = async () => {
    try {
      // Get all conversations for current user
      const { data: conversationsData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant1_id.eq.${currentUserId},participant2_id.eq.${currentUserId}`)
        .order('last_message_at', { ascending: false })

      if (convError) throw convError

      if (!conversationsData || conversationsData.length === 0) {
        setConversations([])
        setLoading(false)
        return
      }

      // Get other user profiles
      const otherUserIds = conversationsData.map((conv) =>
        conv.participant1_id === currentUserId ? conv.participant2_id : conv.participant1_id
      )

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, level')
        .in('id', otherUserIds)

      // Get last message for each conversation
      const conversationIds = conversationsData.map((c) => c.id)
      const { data: lastMessages } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })

      // Get unread counts
      const { data: unreadCounts } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .eq('receiver_id', currentUserId)
        .eq('is_read', false)

      // Combine data
      const enrichedConversations = conversationsData.map((conv) => {
        const otherUserId = conv.participant1_id === currentUserId ? conv.participant2_id : conv.participant1_id
        const otherUser = profiles?.find((p) => p.id === otherUserId)
        const lastMessage = lastMessages?.find((m) => m.conversation_id === conv.id)
        const unreadCount = unreadCounts?.filter((m) => m.conversation_id === conv.id).length || 0

        return {
          ...conv,
          other_user: otherUser,
          last_message: lastMessage,
          unread_count: unreadCount,
        }
      })

      // Also load group conversations where the current user is a member
      const { data: groupMemberships, error: groupMembersError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', currentUserId)

      console.log('🔍 Group memberships:', groupMemberships, 'Error:', groupMembersError)

      let groupConvs: any[] = []
      if (groupMemberships && groupMemberships.length > 0) {
        const groupIds = groupMemberships.map((g: any) => g.group_id)
        console.log('📋 Group IDs:', groupIds)

        const { data: groups, error: groupsError } = await supabase
          .from('groups')
          .select('*')
          .in('id', groupIds)
          .order('created_at', { ascending: false })

        console.log('👥 Groups loaded:', groups, 'Error:', groupsError)

        if (groups && groups.length > 0) {
          // Get last messages for groups
          const { data: lastGroupMessages } = await supabase
            .from('group_messages')
            .select('*')
            .in('group_id', groups.map((g: any) => g.id))
            .order('created_at', { ascending: false })

          // Get members for each group
          const { data: members } = await supabase
            .from('group_members')
            .select('group_id, user_id')
            .in('group_id', groups.map((g: any) => g.id))

          // Load profiles of all members
          const memberIds = Array.from(new Set(members?.map((m: any) => m.user_id)))
          const { data: memberProfiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, level')
            .in('id', memberIds || [])

          groupConvs = groups.map((g: any) => {
            const lastMessage = lastGroupMessages?.find((m: any) => m.group_id === g.id)
            const groupMembers = members?.filter((m: any) => m.group_id === g.id).map((m: any) => memberProfiles?.find((p: any) => p.id === m.user_id)) || []

            return {
              id: `group-${g.id}`,
              is_group: true,
              group_id: g.id,
              name: g.name || null,
              members: groupMembers,
              last_message: lastMessage,
            }
          })
        }
      }

      // Merge one-to-one conversations and groups
      setConversations([...groupConvs, ...enrichedConversations])
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConversationClick = (conversationId: string) => {
    router.push(`/messages?chat=${conversationId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center">
        <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500 mb-2">No tienes conversaciones</p>
        <p className="text-sm text-gray-400">Busca usuarios para empezar a chatear</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100">
      {conversations.map((conversation) => {
        const isSelected = conversation.id === selectedConversationId
        // If group conversation, render differently (type-guard)
        if ("is_group" in conversation && conversation.is_group) {
          const members = conversation.members || []
          const title = conversation.name || members.map((m:any) => m?.username).filter(Boolean).join(', ')
          return (
            <button
              key={conversation.id}
              onClick={() => handleConversationClick(conversation.id)}
              className={`w-full p-4 hover:bg-gray-50 transition text-left ${isSelected ? 'bg-blue-50 hover:bg-blue-50' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex -space-x-2">
                  {members.slice(0,3).map((m:any, idx:number) => (
                    <div key={m?.id || idx} className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
                      {m?.avatar_url ? (
                        <Image src={m.avatar_url} alt={m.username} width={40} height={40} className="object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {m?.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{title}</h3>
                    {conversation.last_message && (
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2" suppressHydrationWarning>
                        {formatDistanceToNow(new Date(conversation.last_message.created_at), { addSuffix: true, locale: es })}
                      </span>
                    )}
                  </div>

                  {conversation.last_message && (
                    <p className={`text-sm truncate ${conversation.unread_count && conversation.unread_count > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                      {conversation.last_message.content}
                    </p>
                  )}
                </div>
              </div>
            </button>
          )
        }

        // Type assertion: if not a group conversation, it must be a regular Conversation
        const regularConversation = conversation as Conversation
        const otherUser = regularConversation.other_user

        if (!otherUser) return null

        return (
          <button
            key={regularConversation.id}
            onClick={() => handleConversationClick(regularConversation.id)}
            className={`w-full p-4 hover:bg-gray-50 transition text-left ${
              isSelected ? 'bg-blue-50 hover:bg-blue-50' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                {otherUser.avatar_url ? (
                  <Image
                    src={otherUser.avatar_url}
                    alt={otherUser.username}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                    {otherUser.username[0]?.toUpperCase()}
                  </div>
                )}
              </div>

              {/* Conversation info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {otherUser.username}
                  </h3>
                  {regularConversation.last_message && (
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2" suppressHydrationWarning>
                      {formatDistanceToNow(new Date(regularConversation.last_message.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </span>
                  )}
                </div>

                {regularConversation.last_message && (
                  <p className={`text-sm truncate ${
                    regularConversation.unread_count && regularConversation.unread_count > 0
                      ? 'font-semibold text-gray-900'
                      : 'text-gray-600'
                  }`}>
                    {regularConversation.last_message.sender_id === currentUserId ? 'Tú: ' : ''}
                    {regularConversation.last_message.content}
                  </p>
                )}

                {/* Unread badge */}
                {regularConversation.unread_count && regularConversation.unread_count > 0 && (
                  <div className="mt-1">
                    <span className="inline-block px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                      {regularConversation.unread_count}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
