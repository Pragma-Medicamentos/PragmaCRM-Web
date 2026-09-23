import { Link } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'

/** Resumen (wireframe 1a): módulo de métricas todavía no implementado. */
export function DashboardPlaceholder() {
  return (
    <AppShell>
      <PageHeader title="Resumen" subtitle="Sesión de Administrador verificada" />

      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyTitle>Los módulos de planificación de rutas y métricas todavía no están implementados.</EmptyTitle>
          <EmptyDescription>
            Por ahora podés gestionar{' '}
            <Link to="/vendedores" className="text-primary underline-offset-4 hover:underline">
              vendedores
            </Link>{' '}
            y ver el listado de{' '}
            <Link to="/clientes" className="text-primary underline-offset-4 hover:underline">
              clientes
            </Link>
            .
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </AppShell>
  )
}
