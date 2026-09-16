import { useState, type ComponentType, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { FileUp, LayoutDashboard, LogOut, Menu, UserCog, Users, X } from 'lucide-react'
import { supabase } from '../lib/supabase/client'
import { useCurrentAppUser } from '../features/auth/useCurrentAppUser'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import pragmaIcon from '../assets/pragma-icon.png'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

// Agrupación tomada del wireframe 1a (sidebar fijo con módulos agrupados),
// reducida a los módulos que ya existen en este repo.
const NAV_GROUPS: NavGroup[] = [
  { label: 'Operación', items: [{ to: '/', label: 'Resumen', icon: LayoutDashboard, end: true }] },
  {
    label: 'Comercial',
    items: [
      { to: '/clientes', label: 'Clientes', icon: Users },
      { to: '/importar', label: 'Importar datos', icon: FileUp },
    ],
  },
  { label: 'Administración', items: [{ to: '/vendedores', label: 'Vendedores', icon: UserCog }] },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {group.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                  )
                }
              >
                <item.icon className="size-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

/** Cabecera y navegación compartidas por las pantallas del panel de Administrador (wireframe 1a). */
export function AppShell({ children }: { children: ReactNode }) {
  const state = useCurrentAppUser()
  const name = state.status === 'ready' ? state.appUser.name : ''
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex h-dvh flex-col bg-muted/30">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 lg:px-6">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          onClick={() => setMobileNavOpen((open) => !open)}
          aria-label={mobileNavOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {mobileNavOpen ? <X /> : <Menu />}
        </Button>

        <img src={pragmaIcon} alt="" className="size-6" />
        <span className="font-heading text-base font-semibold">Pragma CRM</span>
        <span className="hidden text-sm text-muted-foreground sm:inline">· Administrador</span>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{name}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
            <LogOut />
            Cerrar sesión
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
          <NavLinks />
        </aside>

        {mobileNavOpen && (
          <div className="fixed inset-0 z-40 flex lg:hidden">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setMobileNavOpen(false)}
              aria-hidden="true"
            />
            <aside className="relative flex w-64 flex-col border-r border-sidebar-border bg-sidebar shadow-lg">
              <NavLinks onNavigate={() => setMobileNavOpen(false)} />
            </aside>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
