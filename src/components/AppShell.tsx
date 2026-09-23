import type { ComponentType, CSSProperties, ReactNode } from 'react'
import { Link, matchPath, useLocation } from 'react-router-dom'
import { ChevronsUpDown, FileUp, LayoutDashboard, LogOut, Menu, Package, Route, UserCog, Users } from 'lucide-react'
import { supabase } from '../lib/supabase/client'
import { useCurrentAppUser } from '../features/auth/useCurrentAppUser'
import { Avatar, AvatarFallback } from './ui/avatar'
import { Badge } from './ui/badge'
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
  {
    label: 'Operación',
    items: [
      { to: '/', label: 'Resumen', icon: LayoutDashboard, end: true },
      { to: '/rutas', label: 'Planificador de rutas', icon: Route },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { to: '/clientes', label: 'Clientes', icon: Users },
      { to: '/productos', label: 'Productos', icon: Package },
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

function AppSidebar({ name, email }: { name: string; email: string | null }) {
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
          <NavUser name={name} email={email} />
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

function AccountAvatar({ name }: { name: string }) {
  return (
    <Avatar className="size-8 ring-2 ring-white">
      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(name)}</AvatarFallback>
    </Avatar>
  )
}

// Perfil al pie del sidebar, como el de Cursor (patrón NavUser de los bloques
// de shadcn): el botón muestra avatar + nombre y abre hacia arriba, con su mismo
// ancho, un menú con los datos de la sesión y "Cerrar sesión".
function NavUser({ name, email }: { name: string; email: string | null }) {
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent" aria-label="Perfil">
            <AccountAvatar name={name} />
            <div className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate font-medium">{name}</span>
              <span className="truncate text-xs text-muted-foreground">Administrador</span>
            </div>
            <ChevronsUpDown className="ml-auto text-muted-foreground" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          sideOffset={8}
          className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl"
        >
          <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-2 font-normal">
            <span className="truncate text-sm font-medium text-foreground">{name}</span>
            <span className="truncate text-xs text-muted-foreground">{email}</span>
            <Badge className="mt-1.5">Administrador</Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => supabase.auth.signOut()}>
              <LogOut /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

// Franja superior, fuera del sidebar: el botón para abrirlo o cerrarlo. Debajo
// de lg (móvil y tablet) es la hamburguesa que abre el Sheet, junto al logo; en
// escritorio es el botón de panel que oculta o muestra el sidebar flotante.
function TopBar() {
  const { isMobile, toggleSidebar } = useSidebar()

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 px-4 sm:px-6 lg:h-16 lg:px-8">
      {isMobile ? (
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Abrir menú" onClick={toggleSidebar}>
          <Menu />
        </Button>
      ) : (
        <SidebarTrigger className="-ml-2 text-muted-foreground" aria-label="Mostrar u ocultar menú" />
      )}
      <img src={brandIcon} alt="Farmacia Pragma" className="h-6 w-auto lg:hidden" />
    </header>
  )
}

const SIDEBAR_STYLE = {
  // Ancho del panel de antes (w-64 con la escala de --spacing, 20rem) más el
  // p-3 del contenedor floating a cada lado: 64 + 3 + 3 = 70.
  '--sidebar-width': 'calc(var(--spacing) * 70)',
} as CSSProperties

/** El sidebar guarda su estado en la cookie `sidebar_state`, pero en un SPA nadie la lee: se lee acá. */
function readSidebarOpen(): boolean {
  return !document.cookie.split('; ').includes('sidebar_state=false')
}

/** Cabecera y navegación compartidas por las pantallas del panel de Administrador (wireframe 1a). */
export function AppShell({ children }: { children: ReactNode }) {
  const state = useCurrentAppUser()
  const name = state.status === 'ready' ? state.appUser.name : ''
  const email = state.status === 'ready' ? state.appUser.email : ''

  return (
    <SidebarProvider defaultOpen={readSidebarOpen()} style={SIDEBAR_STYLE}>
      <AppSidebar name={name} email={email} />

      {/* Transparente: el fondo con velos de `body` queda detrás del contenido. */}
      <SidebarInset className="min-w-0 bg-transparent">
        <TopBar />

        <div className="flex-1 px-4 pt-4 pb-10 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </div>
      </SidebarInset>

      <Toaster position="bottom-right" />
    </SidebarProvider>
  )
}
