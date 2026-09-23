import { Fragment, type CSSProperties, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AppSidebar } from '@/components/app-sidebar'
import { findActiveNav } from '@/components/nav-config'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { layout } from '@/lib/design-tokens'

interface AppShellProps {
  children: ReactNode
  /** Página hija de la sección activa (p. ej. el nombre del cliente en su perfil). */
  currentPage?: string
}

/** Menú lateral + encabezado con breadcrumb, compartidos por las pantallas del panel de Administrador (wireframe 1a). */
export function AppShell({ children, currentPage }: AppShellProps) {
  const { pathname } = useLocation()
  const active = findActiveNav(pathname)

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': layout.sidebarWidth,
          '--sidebar-width-icon': layout.sidebarWidthIcon,
        } as CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          {active && (
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">{active.group.label}</BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                {currentPage ? (
                  <Fragment>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to={active.item.to}>{active.item.label}</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{currentPage}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </Fragment>
                ) : (
                  <BreadcrumbItem>
                    <BreadcrumbPage>{active.item.label}</BreadcrumbPage>
                  </BreadcrumbItem>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </header>
        <main className="flex flex-1 flex-col p-4 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
