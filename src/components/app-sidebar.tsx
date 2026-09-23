import type { ComponentProps } from 'react'
import { Link } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import { supabase } from '@/lib/supabase/client'
import { brand } from '@/lib/design-tokens'
import { useCurrentAppUser } from '@/features/auth/useCurrentAppUser'
import pragmaIcon from '@/assets/pragma-icon.png'

/** Menú lateral del panel (block `sidebar-07`: colapsable a íconos), con la marca y la sesión de Pragma. */
export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
  const state = useCurrentAppUser()
  const user =
    state.status === 'ready'
      ? { name: state.appUser.name, email: state.appUser.email }
      : { name: '', email: null }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <img src={pragmaIcon} alt="" className="size-8 shrink-0 rounded-lg object-contain" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-heading font-semibold">{brand.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{brand.roleLabel}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} onSignOut={() => supabase.auth.signOut()} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
