import { createClient } from '@/lib/supabase/serverClient'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  if (!query || query.length < 2) {
    return NextResponse.json([])
  }

  const supabase = await createClient()

  // Search for users by username
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, level')
    .ilike('username', `${query}%`)
    .limit(5)

  if (error) {
    console.error('Error searching users:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
