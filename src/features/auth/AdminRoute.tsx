import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'
import { useCurrentAppUser } from './useCurrentAppUser'
import { SessionGate } from './SessionGate'
import type { RedirectReason } from './auth.types'

function toLogin(reason?: RedirectReason) {
  return <Navigate to="/login" replace state={reason ? { reason } : undefined} />
}

/**
 * Deja pasar únicamente a app_user.role === 'Administrador'. Cualquier
 * otro caso (sin sesión, sesión vencida por 401, 403 de la API, o rol
 * Vendedor) vuelve a /login.
 */
export function AdminRoute({ children }: { children: ReactElement }) {
  const state = useCurrentAppUser()

  switch (state.status) {
    case 'loading':
      return <SessionGate />
    case 'signed_out':
      return toLogin(state.expired ? { kind: 'expired' } : undefined)
    case 'forbidden':
      return toLogin({ kind: 'forbidden', message: state.message })
    case 'error':
      return toLogin({ kind: 'forbidden', message: state.message })
    case 'ready': {
      const { appUser } = state
      if (appUser.role !== 'Administrador') return toLogin({ kind: 'role' })
      return children
    }
  }
}
