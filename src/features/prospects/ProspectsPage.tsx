import { useState } from 'react'
import { toast } from 'sonner'
import { MapPin, MapPinPlus, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ApiError } from '../../lib/api/apiClient'
import { PageHeader } from '../../components/PageHeader'
import { PendingBackendNotice } from '../../components/PendingBackendNotice'
import { Button } from '../../components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
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
import { EditProspectDialog } from './EditProspectDialog'
import { deleteProspect } from './prospectsApi'
import type { Prospect } from './prospects.types'

const dateFormatter = new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeStyle: 'short' })

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
}

interface ProspectsTableProps {
  prospects: Prospect[]
  onSetLocation: (prospect: Prospect) => void
  onEdit: (prospect: Prospect) => void
  onDelete: (prospect: Prospect) => void
}

function ProspectsTable({ prospects, onSetLocation, onEdit, onDelete }: ProspectsTableProps) {
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
          <TableHead className="w-12">
            <span className="sr-only">Acciones</span>
          </TableHead>
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
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Acciones de ${prospect.name}`}>
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => onEdit(prospect)}>
                      <Pencil /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onSetLocation(prospect)}>
                      <MapPinPlus /> {prospect.location ? 'Corregir ubicación' : 'Agregar ubicación'}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem variant="destructive" onSelect={() => onDelete(prospect)}>
                      <Trash2 /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
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
  const [editing, setEditing] = useState<Prospect | null>(null)
  const [deleting, setDeleting] = useState<Prospect | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  async function handleDelete(prospect: Prospect) {
    setDeleteSubmitting(true)
    try {
      const { removed_stops } = await deleteProspect(prospect.id)
      const stopsNote =
        removed_stops > 0
          ? ` Se ${removed_stops === 1 ? 'quitó 1 parada pendiente' : `quitaron ${removed_stops} paradas pendientes`}.`
          : ''
      toast.success(`${prospect.name}: prospecto eliminado.${stopsNote}`)
      reload()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar el prospecto.')
    } finally {
      setDeleteSubmitting(false)
      setDeleting(null)
    }
  }

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
          <ProspectsTable
            prospects={prospects}
            onSetLocation={setSettingLocation}
            onEdit={setEditing}
            onDelete={setDeleting}
          />
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

      {editing && (
        <EditProspectDialog
          prospect={editing}
          onClose={() => setEditing(null)}
          onUpdated={(prospect) => {
            setEditing(null)
            toast.success(`${prospect.name}: cambios guardados.`)
            reload()
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Eliminar ${deleting.name}`}
          message="El prospecto sale del listado y se quitan sus paradas pendientes de la ruta del vendedor. Las visitas ya registradas se conservan."
          confirmLabel="Eliminar prospecto"
          destructive
          submitting={deleteSubmitting}
          onCancel={() => setDeleting(null)}
          onConfirm={() => handleDelete(deleting)}
        />
      )}
    </AppShell>
  )
}
