import { Link } from 'react-router-dom'
import { FileUp } from 'lucide-react'
import { AppShell } from '../components/AppShell'
import { PageHeader } from '../components/PageHeader'
import { BarChart } from '../components/charts'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { cn } from '../lib/utils'

/*
 * Resumen (KPIs del wireframe 1a, gráfico de 1e). El módulo de métricas
 * (RF-09) todavía no tiene endpoint, así que las cifras son de ejemplo tomadas
 * de los wireframes y reducidas a lo esencial: sirven para ver cómo va a
 * quedar la pantalla. Al conectar la API, se reemplaza `SAMPLE` y se quita la
 * etiqueta de vista previa.
 */
const SAMPLE = {
  kpis: [
    { label: 'Paradas ejecutadas', value: '62', delta: '+8%', positive: true },
    { label: 'Ticket promedio', value: '$118', delta: '+3%', positive: true },
    { label: 'Clientes sin visita', value: '18', delta: '−4', positive: true },
    { label: 'Prospectos nuevos', value: '7', delta: 'igual', positive: false },
  ],
  weeklyStops: [
    { label: '3 ago', value: 48 },
    { label: '10 ago', value: 55 },
    { label: '17 ago', value: 51 },
    { label: '24 ago', value: 58 },
    { label: '31 ago', value: 62 },
  ],
}

interface KpiCardProps {
  label: string
  value: string
  delta: string
  positive: boolean
}

function KpiCard({ label, value, delta, positive }: KpiCardProps) {
  return (
    <Card size="sm" className="gap-3">
      <CardHeader>
        <CardDescription className="font-medium text-foreground/80">{label}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight tabular-nums">{value}</span>
        <span className={cn('text-xs font-medium', positive ? 'text-primary' : 'text-muted-foreground')}>
          {delta}
        </span>
      </CardContent>
    </Card>
  )
}

/** Resumen (wireframe 1a): vista previa del panel de métricas con datos de ejemplo. */
export function DashboardPlaceholder() {
  return (
    <AppShell>
      <PageHeader
        title="Resumen"
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            Semana del 31 ago al 5 sept · 4 vendedores activos
            <Badge variant="outline" title="Las cifras son de ejemplo hasta que el módulo de métricas esté disponible.">
              Vista previa · datos de ejemplo
            </Badge>
          </span>
        }
        actions={
          <Button asChild>
            <Link to="/importar">
              <FileUp data-icon="inline-start" /> Importar datos
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SAMPLE.kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Paradas por semana</CardTitle>
            <CardDescription>Últimas 5 semanas</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart
              data={SAMPLE.weeklyStops}
              highlight={SAMPLE.weeklyStops.length - 1}
              label="Paradas ejecutadas por semana, datos de ejemplo"
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
