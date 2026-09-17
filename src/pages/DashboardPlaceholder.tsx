import { Link } from 'react-router-dom'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/PageHeader'

/** Resumen (wireframe 1a): módulo de métricas todavía no implementado. */
export function DashboardPlaceholder() {
  return (
    <AppShell>
      <PageHeader title="Resumen" subtitle="Sesión de Administrador verificada" />

      <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background p-10 text-center">
        <p className="text-sm font-medium text-foreground">
          Los módulos de planificación de rutas y métricas todavía no están implementados.
        </p>
        <p className="text-sm text-muted-foreground">
          Por ahora podés gestionar{' '}
          <Link to="/vendedores" className="text-primary underline-offset-4 hover:underline">
            vendedores
          </Link>{' '}
          y ver el listado de{' '}
          <Link to="/clientes" className="text-primary underline-offset-4 hover:underline">
            clientes
          </Link>
          .
        </p>
      </div>
    </AppShell>
  )
}
