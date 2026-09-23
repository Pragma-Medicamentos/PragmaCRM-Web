import type { ComponentType } from 'react'
import { FileUp, LayoutDashboard, UserCog, Users } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: ComponentType
  /** Solo coincide con la ruta exacta (para "/" que, si no, sería prefijo de todas). */
  end?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

// Agrupación tomada del wireframe 1a (sidebar fijo con módulos agrupados),
// reducida a los módulos que ya existen en este repo.
export const NAV_GROUPS: NavGroup[] = [
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

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}

/** Grupo e ítem que corresponden a la ruta actual, para el breadcrumb del encabezado. */
export function findActiveNav(pathname: string): { group: NavGroup; item: NavItem } | null {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (isNavItemActive(item, pathname)) return { group, item }
    }
  }
  return null
}
