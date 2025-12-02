import { createClient } from '@/lib/supabase/serverClient'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'

  if (code) {
    const supabase = await createClient()
    
    // Intercambiar el código por una sesión
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Redirigir al home con mensaje de éxito
      const redirectUrl = new URL(next, requestUrl.origin)
      redirectUrl.searchParams.set('confirmed', 'true')
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Si hay error, redirigir a login con mensaje de error
  const redirectUrl = new URL('/login', requestUrl.origin)
  redirectUrl.searchParams.set('error', 'confirmation_failed')
  return NextResponse.redirect(redirectUrl)
}
