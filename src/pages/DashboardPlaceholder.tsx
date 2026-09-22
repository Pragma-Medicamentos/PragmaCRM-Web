import { Link } from 'react-router-dom'
import { FileUp, LayoutDashboard, UserCog, Users } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/PageHeader'
import { Button } from '../components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../components/ui/empty'

/** Resumen (wireframe 1a): módulo de métricas todavía no implementado. */
export function DashboardPlaceholder() {
  return (
    <AppShell>
      <PageHeader title="Resumen" subtitle="Sesión de Administrador verificada" />

      <Empty className="min-h-80 rounded-xl border border-dashed bg-background">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LayoutDashboard />
          </EmptyMedia>
          <EmptyTitle>Las métricas todavía no están disponibles</EmptyTitle>
          <EmptyDescription>
            Los módulos de planificación de rutas y métricas están pendientes. Mientras tanto, estos son los
            módulos que ya podés usar.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row flex-wrap justify-center gap-2">
          <Button asChild variant="outline">
            <Link to="/vendedores">
              <UserCog data-icon="inline-start" /> Vendedores
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/clientes">
              <Users data-icon="inline-start" /> Clientes
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/importar">
              <FileUp data-icon="inline-start" /> Importar datos
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    </AppShell>
  )
}
