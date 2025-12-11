'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/browserClient'
import { X, Search } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function CreateGroupModal({ isOpen, onClose, currentUserId }: { isOpen: boolean, onClose: () => void, currentUserId: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [selected, setSelected] = useState<any[]>([])
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  if (!isOpen) return null

  const handleSearch = async (q: string) => {
    setQuery(q)
    if (q.trim().length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, level')
      .ilike('username', `%${q}%`)
      .limit(10)

    setLoading(false)
    if (error) {
      console.error(error)
      return
    }

    // Exclude current user and already selected
    const filtered = (data || []).filter((p: any) => p.id !== currentUserId && !selected.some(s => s.id === p.id))
    setResults(filtered)
  }

  const toggleSelect = (profile: any) => {
    // limit total members to 2 others (owner + up to 2 = 3)
    if (selected.find(s => s.id === profile.id)) {
      setSelected(selected.filter(s => s.id !== profile.id))
    } else {
      if (selected.length >= 2) return
      setSelected([...selected, profile])
      // remove from results
      setResults(results.filter(r => r.id !== profile.id))
    }
  }

  const handleCreate = async () => {
    if (!groupName.trim()) {
      alert('Por favor, ingresa un nombre para el grupo')
      return
    }
    
    setCreating(true)
    try {
      const memberIds = selected.map(s => s.id)
      console.log('🎯 Creating group:', groupName.trim(), 'Owner:', currentUserId, 'Members:', memberIds)
      
      const { data, error } = await supabase.rpc('create_group', { 
        p_name: groupName.trim(),
        p_owner_id: currentUserId, 
        p_member_ids: memberIds 
      })
      
      console.log('✅ Group created:', data, 'Error:', error)
      if (error) throw error
      const groupId = data
      
      // Verificar que se crearon los miembros
      const { data: members, error: membersError } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
      
      console.log('👥 Group members after creation:', members, 'Error:', membersError)
      onClose()
      setGroupName('')
      setSelected([])
      setQuery('')
      setResults([])
      router.push(`/messages?chat=group-${groupId}`)
    } catch (err: any) {
      alert(err.message || 'Error creando el grupo')
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Crear Grupo</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-4">Selecciona hasta 2 usuarios para crear un grupo (máx 3 miembros).</p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del grupo</label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Amigos, Familia, Trabajo..."
              maxLength={50}
            />
          </div>

          <div className="relative mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Agregar miembros</label>
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              placeholder="Buscar usuarios por nombre..."
            />
            <div className="absolute right-3 top-10 text-gray-400"><Search className="w-5 h-5" /></div>
          </div>

          <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
            {results.map((r) => (
              <button key={r.id} onClick={() => toggleSelect(r)} className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg text-left">
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  {r.avatar_url ? (
                    <Image src={r.avatar_url} alt={r.username} width={40} height={40} className="object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {r.username[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-semibold">{r.username}</div>
                  <div className="text-xs text-gray-500">Nivel {r.level}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-semibold mb-2">Seleccionados ({selected.length}/2)</h4>
            <div className="flex gap-2">
              {selected.map(s => (
                <div key={s.id} className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-full">
                  <div className="w-6 h-6 rounded-full overflow-hidden">
                    {s.avatar_url ? (
                      <Image src={s.avatar_url} alt={s.username} width={24} height={24} className="object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {s.username[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="text-sm">{s.username}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100">Cancelar</button>
            <button 
              disabled={creating || selected.length < 1 || !groupName.trim()} 
              onClick={handleCreate} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? 'Creando...' : 'Crear Grupo'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
