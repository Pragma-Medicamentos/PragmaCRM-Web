import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { ApiError, consumeSessionExpired } from '../../lib/api/apiClient'
import { fetchMe } from './authApi'
import type { AppUser } from './auth.types'

export type AppUserState =
  | { status: 'loading' }
  // `expired`: la sesión se cerró porque la API respondió 401 (ver el
  // interceptor de apiClient.ts), no porque el usuario salió.
  | { status: 'signed_out'; expired: boolean }
  | { status: 'forbidden'; message: string }
  | { status: 'error'; message: string }
  | { status: 'ready'; appUser: AppUser }

/**
 * Resuelve el perfil (role, name, email) llamando a GET /api/v1/me; el token
 * de la sesión de Supabase vigente lo adjunta el interceptor de apiClient.
 * `onAuthStateChange` emite el estado inicial al suscribirse y cualquier
 * cambio posterior (login, logout, refresh de token), así que no hace falta
 * pedir la sesión aparte. Un 401 en cualquier llamada de la app cierra la
 * sesión en el interceptor y llega aquí como SIGNED_OUT (vuelve a /login sin
 * bucle); 403 significa sesión válida pero usuario que no puede operar (sin
 * fila en app_user, deshabilitado) y conserva el `message` que mandó la API —
 * ver PragmaCRM-Web/CLAUDE.md.
 */
export function useCurrentAppUser(): AppUserState {
  const [state, setState] = useState<AppUserState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    let lastToken: string | null | undefined

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const token = session?.access_token ?? null

      // onAuthStateChange dispara de nuevo en cada refresh de token (~60s):
      // sin este guard, /api/v1/me se repetiría sin necesidad.
      if (token === lastToken) return
      lastToken = token

      if (!token) {
        if (!cancelled) setState({ status: 'signed_out', expired: consumeSessionExpired() })
        return
      }

      setState({ status: 'loading' })

      fetchMe()
        .then((appUser) => {
          if (!cancelled) setState({ status: 'ready', appUser })
        })
        .catch((err: unknown) => {
          if (cancelled) return

          if (err instanceof ApiError && err.status === 401) {
            // El interceptor ya cerró la sesión y el SIGNED_OUT resultante
            // fijó `signed_out` (con `expired`); no lo pisamos.
            setState((prev) => (prev.status === 'signed_out' ? prev : { status: 'signed_out', expired: false }))
            return
          }
          if (err instanceof ApiError && err.status === 403) {
            setState({ status: 'forbidden', message: err.message })
            return
          }
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Error desconocido al resolver el perfil',
          })
        })
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return state
}
