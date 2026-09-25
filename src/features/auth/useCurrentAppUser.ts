import { useEffect, useState } from 'react'
import { onSessionEnded } from '../../lib/auth/sessionEvents'
import { apiRequest, ApiError, clearSessionExpired, wasSessionExpired } from '../../lib/api/apiClient'
import type { AppUser } from './auth.types'

export type AppUserState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'expired' }
  | { status: 'forbidden'; message: string }
  | { status: 'error'; message: string }
  | { status: 'ready'; appUser: AppUser }

// `apiClient` marca la sesión como vencida cuando la API rechaza la cookie
// y el refresh falla; aquí eso se distingue de un logout voluntario.
function signedOutState(): AppUserState {
  return wasSessionExpired() ? { status: 'expired' } : { status: 'signed_out' }
}

/**
 * Resuelve el perfil (role, name, email) con GET /api/v1/me. La sesión viaja
 * en la cookie HttpOnly (credentials), no en un Bearer leído de
 * localStorage. 401 se trata como "sin sesión" (vuelve a /login; con motivo
 * `expired` si la API invalidó una sesión que sí existía). 403 significa
 * sesión válida pero usuario que no puede operar y conserva el `message`.
 */
export function useCurrentAppUser(): AppUserState {
  const [state, setState] = useState<AppUserState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    function load() {
      setState({ status: 'loading' })
      apiRequest<AppUser>('/api/v1/me')
        .then((appUser) => {
          if (cancelled) return
          clearSessionExpired()
          setState({ status: 'ready', appUser })
        })
        .catch((err: unknown) => {
          if (cancelled) return

          if (err instanceof ApiError && err.status === 401) {
            setState(signedOutState())
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
    }

    load()
    const unsubscribe = onSessionEnded(() => {
      if (!cancelled) setState(signedOutState())
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return state
}
