import { useClerk } from '@clerk/clerk-react'
import { useCurrentAppUser } from '../features/auth/useCurrentAppUser'

export function DashboardPlaceholder() {
  const { signOut } = useClerk()
  const state = useCurrentAppUser()
  const name = state.status === 'ready' ? state.appUser.name : ''

  return (
    <div className="dashboard">
      <header className="dashboard__topbar">
        <span className="dashboard__brand">Pragma CRM</span>
        <div className="dashboard__user">
          <span>{name}</span>
          <button type="button" onClick={() => signOut()}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="dashboard__body">
        <p>
          Sesión de Administrador verificada.
          <br />
          Los módulos de gestión (vendedores, clientes, rutas) no están implementados todavía.
        </p>
      </main>
    </div>
  )
}
