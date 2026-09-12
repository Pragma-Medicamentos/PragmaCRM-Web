import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch, ApiError } from '../../lib/api/apiClient'
import type { AppUser } from './auth.types'

export type AppUserState =
  | { status: 'loading' }
  | { status: 'signed_out' }
  | { status: 'forbidden'; message: string }
  | { status: 'error'; message: string }
  | { status: 'ready'; appUser: AppUser }

/**
 * Resuelve el perfil (role, name, email) llamando a GET /api/v1/me con
 * un token fresco de Clerk por request. 401 se trata igual que "sin
 * sesión" (vuelve a /login sin bucle); 403 significa sesión válida pero
 * usuario que no puede operar (sin fila en app_user, deshabilitado) y
 * conserva el `message` que mandó la API — ver PragmaCRM-Web/CLAUDE.md.
 */
export function useCurrentAppUser(): AppUserState {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const [state, setState] = useState<AppUserState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    if (!isLoaded) {
      setState({ status: 'loading' })
      return
    }

    if (!isSignedIn) {
      setState({ status: 'signed_out' })
      return
    }

    setState({ status: 'loading' })

    getToken()
      .then((token) => apiFetch<AppUser>('/api/v1/me', token))
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

    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, getToken])

  return state
}
