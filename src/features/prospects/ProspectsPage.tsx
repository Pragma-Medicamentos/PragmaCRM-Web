import { MapPin } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { PendingBackendNotice } from '../../components/PendingBackendNotice'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { useProspects } from './useProspects'
import type { Prospect } from './prospects.types'

const dateFormatter = new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeStyle: 'short' })

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
}

function ProspectsTable({ prospects }: { prospects: Prospect[] }) {
  if (prospects.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No hay prospectos registrados.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Teléfono</TableHead>
          <TableHead>GPS</TableHead>
          <TableHead>Vendedor</TableHead>
          <TableHead>Detectado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {prospects.map((prospect) => (
          <TableRow key={prospect.id}>
            <TableCell className="font-medium text-foreground">{prospect.name}</TableCell>
            <TableCell className="text-muted-foreground">{prospect.phone ?? '—'}</TableCell>
            <TableCell>
              {prospect.location ? (
                <a
                  href={`https://maps.google.com/?q=${prospect.location.lat},${prospect.location.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <MapPin className="size-4" /> Ver mapa
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">sin ubicación</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">{prospect.seller_name ?? prospect.user_id}</TableCell>
            <TableCell className="text-muted-foreground">{formatDate(prospect.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Listado admin de prospectos: quién detectó + cuándo (PCRM-64). */
export function ProspectsPage() {
  const { state } = useProspects()
  const prospects = state.status === 'ready' ? state.prospects : []

  return (
    <AppShell>
      <PageHeader
        title="Prospectos"
        subtitle={state.status === 'ready' ? `${prospects.length} prospectos detectados` : undefined}
      />

      {state.status === 'loading' && <p className="text-sm text-muted-foreground">Cargando prospectos…</p>}
      {state.status === 'pending-backend' && <PendingBackendNotice endpoints={['GET /api/v1/prospects']} />}
      {state.status === 'error' && (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      )}

      {state.status === 'ready' && (
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <ProspectsTable prospects={prospects} />
        </div>
      )}
    </AppShell>
  )
}
