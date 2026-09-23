import type { ComponentType, CSSProperties, ReactNode } from 'react'
import { Link, matchPath, useLocation } from 'react-router-dom'
import { FileUp, LayoutDashboard, LogOut, UserCog, Users } from 'lucide-react'
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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from './ui/sidebar'
import { Toaster } from './ui/sonner'
import brandWordmark from '../assets/brand-wordmark.png'
import brandIcon from '../assets/brand-icon.png'

interface NavItem {
  to: string
  label: string
  icon: ComponentType
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

function AppSidebar() {
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()
  // En móvil el sidebar es un Sheet: se cierra al navegar.
  const closeOnMobile = () => isMobile && setOpenMobile(false)

  return (
    // floating: panel de vidrio despegado del borde (ver `glass` en sidebar.tsx).
    <Sidebar variant="floating" className="p-3">
      <SidebarHeader className="h-20 justify-center px-5">
        <img src={brandWordmark} alt="Farmacia Pragma" className="h-7 w-auto self-start" />
      </SidebarHeader>
      <SidebarSeparator className="mx-0 bg-primary/10" />

      <SidebarContent className="gap-2 py-2">
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="font-semibold tracking-wider text-muted-foreground uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={matchPath({ path: item.to, end: item.end ?? false }, pathname) !== null}
                    >
                      <Link to={item.to} onClick={closeOnMobile}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator className="mx-0 bg-primary/10" />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="text-muted-foreground" onClick={() => supabase.auth.signOut()}>
              <LogOut />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

function AccountMenu({ name, email }: { name: string; email: string | null }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="glass relative h-auto gap-2.5 rounded-full py-1 pr-3 pl-1"
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

  return (
    // Ancho del panel de antes (w-64 con la escala de --spacing, 20rem) más el
    // p-3 del contenedor floating a cada lado: 64 + 3 + 3 = 70.
    <SidebarProvider style={{ '--sidebar-width': 'calc(var(--spacing) * 70)' } as CSSProperties}>
      <AppSidebar />

      {/* Transparente: el fondo con velos de `body` queda detrás del contenido. */}
      <SidebarInset className="min-w-0 bg-transparent">
        <header className="flex h-16 shrink-0 items-center gap-3 px-4 md:h-20 md:px-6">
          <SidebarTrigger aria-label="Mostrar u ocultar menú" />
          <img src={brandIcon} alt="Farmacia Pragma" className="h-6 w-auto md:hidden" />

          <div className="hidden min-w-0 md:block">
            <p className="text-xs text-muted-foreground">Panel de administración</p>
            <p className="truncate text-lg font-semibold tracking-tight text-foreground">
              {firstName ? `Hola, ${firstName}` : 'Hola'}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <AccountMenu name={name} email={email} />
          </div>
        </header>

        <div className="flex-1 px-4 pb-8 md:px-6">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </div>
      </SidebarInset>

      <Toaster position="bottom-right" />
    </SidebarProvider>
  )
}
