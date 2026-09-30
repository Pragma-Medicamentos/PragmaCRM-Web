import { useState } from 'react'
import { toast } from 'sonner'
import { MapPin, MapPinPlus, Plus } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { PendingBackendNotice } from '../../components/PendingBackendNotice'
import { Button } from '../../components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { useProspects } from './useProspects'
import { CreateProspectDialog } from './CreateProspectDialog'
import { SetProspectLocationDialog } from './SetProspectLocationDialog'
import type { Prospect } from './prospects.types'

const dateFormatter = new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeStyle: 'short' })

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
}

interface ProspectsTableProps {
  prospects: Prospect[]
  onSetLocation: (prospect: Prospect) => void
}

function ProspectsTable({ prospects, onSetLocation }: ProspectsTableProps) {
  if (prospects.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No hay prospectos registrados.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
          <TableHead>GPS</TableHead>
          <TableHead className="hidden md:table-cell">Vendedor</TableHead>
          <TableHead className="hidden lg:table-cell">Detectado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {prospects.map((prospect) => (
          <TableRow key={prospect.id}>
            <TableCell className="max-w-44 sm:max-w-64">
              <div className="truncate font-medium text-foreground">{prospect.name}</div>
              {prospect.phone && <div className="truncate text-xs text-muted-foreground sm:hidden">{prospect.phone}</div>}
            </TableCell>
            <TableCell className="hidden text-muted-foreground sm:table-cell">{prospect.phone ?? '—'}</TableCell>
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
                <Button type="button" variant="ghost" size="sm" onClick={() => onSetLocation(prospect)}>
                  <MapPinPlus className="size-4" /> Agregar ubicación
                </Button>
              )}
            </TableCell>
            <TableCell className="hidden text-muted-foreground md:table-cell">{prospect.seller_name ?? prospect.user_id}</TableCell>
            <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDate(prospect.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Listado admin de prospectos: quién detectó + cuándo (PCRM-64). Alta manual y GPS a posteriori, ver CreateProspectDialog / SetProspectLocationDialog. */
export function ProspectsPage() {
  const { state, reload } = useProspects()
  const prospects = state.status === 'ready' ? state.prospects : []
  const [createOpen, setCreateOpen] = useState(false)
  const [settingLocation, setSettingLocation] = useState<Prospect | null>(null)

  return (
    <AppShell>
      <PageHeader
        title="Prospectos"
        subtitle={state.status === 'ready' ? `${prospects.length} prospectos detectados` : undefined}
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" /> Agregar prospecto
          </Button>
        }
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
          <ProspectsTable prospects={prospects} onSetLocation={setSettingLocation} />
        </div>
      )}

      {createOpen && (
        <CreateProspectDialog
          onClose={() => setCreateOpen(false)}
          onCreated={(prospect) => {
            setCreateOpen(false)
            toast.success(`${prospect.name}: prospecto registrado.`)
            reload()
          }}
        />
      )}

      {settingLocation && (
        <SetProspectLocationDialog
          prospect={settingLocation}
          onClose={() => setSettingLocation(null)}
          onUpdated={(prospect) => {
            setSettingLocation(null)
            toast.success(`${prospect.name}: ubicación guardada.`)
            reload()
          }}
        />
      )}
    </AppShell>
  )
}
