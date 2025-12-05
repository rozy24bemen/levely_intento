import { createClient } from '@/lib/supabase/serverClient'
import { redirect } from 'next/navigation'
import ConversationsList from '@/components/ConversationsList'
import ChatWindow from '@/components/ChatWindow'

type MessagesPageProps = {
  searchParams: Promise<{ chat?: string }>
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const params = await searchParams
  const selectedConversationId = params.chat || null
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Mensajes</h1>
          <p className="text-gray-600">Chatea con otros usuarios de LEVELY</p>
        </header>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
          <div className="flex h-full">
            {/* Conversations list - sidebar */}
            <div className="w-full md:w-80 lg:w-96 border-r border-gray-200 overflow-y-auto">
              <ConversationsList 
                currentUserId={user.id}
                selectedConversationId={selectedConversationId}
              />
            </div>

            {/* Chat window - main area */}
            <div className="hidden md:flex flex-1">
              {selectedConversationId ? (
                <ChatWindow 
                  conversationId={selectedConversationId}
                  currentUserId={user.id}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <div className="text-6xl mb-4">💬</div>
                    <p className="text-lg">Selecciona una conversación</p>
                    <p className="text-sm mt-2">O busca un usuario para empezar a chatear</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
