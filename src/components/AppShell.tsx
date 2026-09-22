import { useState, type ComponentType, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { FileUp, LayoutDashboard, LogOut, Menu, UserCog, Users } from 'lucide-react'
import { supabase } from '../lib/supabase/client'
import { useCurrentAppUser } from '../features/auth/useCurrentAppUser'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from './ui/sheet'
import { Toaster } from './ui/sonner'
import { cn } from '../lib/utils'
import brandWordmark from '../assets/brand-wordmark.png'
import brandIcon from '../assets/brand-icon.png'

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

/** Iniciales para el avatar: dos como mucho, que es lo que entra en un círculo. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

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
                    // La barra de acento vive en ::before para que no desplace
                    // el texto al activarse, como haría un border-left.
                    'relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    'before:absolute before:top-1/2 before:left-0 before:h-0 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary before:transition-all',
                    isActive
                      ? 'bg-primary/10 text-primary before:h-5'
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
  const email = state.status === 'ready' ? state.appUser.email : ''
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex h-dvh flex-col bg-surface">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 lg:px-6">
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Abrir menú">
              <Menu />
            </Button>
          </SheetTrigger>
          {/* gap-0: el drawer es cabecera + nav pegadas, no una pila espaciada. */}
          <SheetContent side="left" className="gap-0 bg-sidebar p-0">
            <SheetTitle className="sr-only">Navegación</SheetTitle>
            <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4">
              <img src={brandWordmark} alt="Farmacia Pragma" className="h-6 w-auto" />
            </div>
            <NavLinks onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>

        <img src={brandWordmark} alt="Farmacia Pragma" className="hidden h-6 w-auto sm:block" />
        <img src={brandIcon} alt="Farmacia Pragma" className="h-6 w-auto sm:hidden" />
        <span className="hidden text-sm text-muted-foreground lg:inline">· Panel de administración</span>

        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="gap-2 pl-1" aria-label="Cuenta">
                <Avatar className="size-6">
                  <AvatarFallback className="bg-primary/10 text-[0.65rem] font-semibold text-primary">
                    {initials(name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-40 truncate sm:inline">{name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="truncate font-medium">{name}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
                <span className="text-xs font-normal text-primary">Administrador</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => supabase.auth.signOut()}>
                  <LogOut /> Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-60 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
          <NavLinks />
        </aside>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>

      <Toaster position="bottom-right" />
    </div>
  )
}
