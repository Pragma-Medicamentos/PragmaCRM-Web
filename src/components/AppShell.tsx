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
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 pb-1.5 text-[0.7rem] font-semibold tracking-wider text-muted-foreground uppercase">
            {group.label}
          </p>
          <div className="flex flex-col gap-1">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group/nav flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                    // Activo: píldora blanca en relieve sobre el vidrio del
                    // sidebar, como en la referencia; el verde queda en el
                    // texto y el icono, no en un bloque de color.
                    isActive
                      ? 'bg-white text-primary shadow-[0_1px_2px_oklch(0.24_0.07_148/0.08),0_4px_12px_-4px_oklch(0.24_0.07_148/0.14)] ring-1 ring-primary/10'
                      : 'text-sidebar-foreground/70 hover:bg-white/60 hover:text-sidebar-foreground'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={cn(
                        'size-[1.125rem] shrink-0 transition-colors',
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover/nav:text-sidebar-foreground'
                      )}
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

function AccountMenu({ name, email }: { name: string; email: string | null }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="h-auto gap-2.5 rounded-full bg-white/60 py-1 pr-3 pl-1 shadow-glass ring-1 ring-white/80 backdrop-blur-xl hover:bg-white/80"
          aria-label="Cuenta"
        >
          <Avatar className="size-8 ring-2 ring-white">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-40 truncate text-sm font-medium sm:inline">{name}</span>
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
  )
}

/** Cabecera y navegación compartidas por las pantallas del panel de Administrador (wireframe 1a). */
export function AppShell({ children }: { children: ReactNode }) {
  const state = useCurrentAppUser()
  const name = state.status === 'ready' ? state.appUser.name : ''
  const email = state.status === 'ready' ? state.appUser.email : ''
  const firstName = name.trim().split(/\s+/)[0] ?? ''
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="flex h-dvh gap-3 lg:p-3">
      {/* Sidebar como panel de vidrio flotante: más claro y opaco que el
          fondo tintado para que se lea como una capa aparte, con canto de luz
          arriba y un borde verde muy tenue que lo separa del cuerpo. */}
      <aside className="hidden w-64 shrink-0 flex-col overflow-hidden rounded-3xl bg-white/70 shadow-[inset_0_1px_0_white,var(--shadow-float)] ring-1 ring-primary/10 backdrop-blur-2xl lg:flex">
        <div className="flex h-20 shrink-0 items-center border-b border-primary/10 px-6">
          <img src={brandWordmark} alt="Farmacia Pragma" className="h-7 w-auto" />
        </div>
        <NavLinks />
        <div className="shrink-0 border-t border-primary/10 p-3">
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start gap-3 rounded-xl px-3 text-muted-foreground hover:bg-white/60 hover:text-foreground"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut className="size-[1.125rem]" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 px-4 lg:h-20 lg:px-6">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" className="lg:hidden" aria-label="Abrir menú">
                <Menu />
              </Button>
            </SheetTrigger>
            {/* gap-0: el drawer es cabecera + nav pegadas, no una pila espaciada. */}
            <SheetContent side="left" className="gap-0 bg-white/85 p-0 backdrop-blur-2xl">
              <SheetTitle className="sr-only">Navegación</SheetTitle>
              <div className="flex h-16 shrink-0 items-center px-5">
                <img src={brandWordmark} alt="Farmacia Pragma" className="h-6 w-auto" />
              </div>
              <NavLinks onNavigate={() => setMobileNavOpen(false)} />
            </SheetContent>
          </Sheet>

          <img src={brandIcon} alt="Farmacia Pragma" className="h-6 w-auto lg:hidden" />

          <div className="hidden min-w-0 lg:block">
            <p className="text-xs text-muted-foreground">Panel de administración</p>
            <p className="truncate text-lg font-semibold tracking-tight text-foreground">
              {firstName ? `Hola, ${firstName}` : 'Hola'}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <AccountMenu name={name} email={email} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-8 lg:px-6">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>

      <Toaster position="bottom-right" />
    </div>
  )
}
