import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { useCurrentAppUser } from '../features/auth/useCurrentAppUser'

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'app-shell__nav-link app-shell__nav-link--active' : 'app-shell__nav-link'
}

/** Cabecera y navegación compartidas por las pantallas del panel de Administrador. */
export function AppShell({ children }: { children: ReactNode }) {
  const state = useCurrentAppUser()
  const name = state.status === 'ready' ? state.appUser.name : ''

  return (
    <div className="app-shell">
      <header className="app-shell__topbar">
        <span className="app-shell__brand">Pragma CRM</span>
        <nav className="app-shell__nav">
          <NavLink to="/" end className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/vendedores" className={navLinkClass}>
            Vendedores
          </NavLink>
          <NavLink to="/clientes" className={navLinkClass}>
            Clientes
          </NavLink>
        </nav>
        <div className="app-shell__user">
          <span>{name}</span>
          <button type="button" onClick={() => supabase.auth.signOut()}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="app-shell__body">{children}</main>
    </div>
  )
}
