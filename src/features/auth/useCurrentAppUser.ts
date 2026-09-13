import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase/client'
import { apiFetch, ApiError } from '../../lib/api/apiClient'
import type { AppUser } from './auth.types'

export type AppUserState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'forbidden'; message: string }
  | { status: 'error'; message: string }
  | { status: 'ready'; appUser: AppUser }

/**
 * Resuelve el perfil (role, name, email) llamando a GET /api/v1/me con el
 * access token de la sesión de Supabase vigente. `onAuthStateChange` emite
 * el estado inicial al suscribirse y cualquier cambio posterior (login,
 * logout, refresh de token), así que no hace falta pedir la sesión aparte.
 * 401 se trata igual que "sin sesión" (vuelve a /login sin bucle); 403
 * significa sesión válida pero usuario que no puede operar (sin fila en
 * app_user, deshabilitado) y conserva el `message` que mandó la API — ver
 * PragmaCRM-Web/CLAUDE.md.
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
        if (!cancelled) setState({ status: 'signed_out' })
        return
      }

      setState({ status: 'loading' })

      apiFetch<AppUser>('/api/v1/me', token)
        .then((appUser) => {
          if (!cancelled) setState({ status: 'ready', appUser })
        })
        .catch((err: unknown) => {
          if (cancelled) return

          if (err instanceof ApiError && err.status === 401) {
            setState({ status: 'signed_out' })
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
