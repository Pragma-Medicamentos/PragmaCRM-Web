import { useMemo, useState } from 'react'
import { CircleCheck, KeyRound, MoreHorizontal, Pencil, Plus, Power, SearchX } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ErrorAlert } from '@/components/ErrorAlert'
import { FilterToggleGroup } from '@/components/FilterToggleGroup'
import { LoadingNotice } from '@/components/LoadingNotice'
import { SearchField } from '@/components/SearchField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/apiClient'
import { useVendors } from './useVendors'
import { CreateVendorDialog } from './CreateVendorDialog'
import { EditVendorDialog } from './EditVendorDialog'
import { resendVendorOtp, setVendorActive } from './vendorsApi'
import type { Vendor } from './vendors.types'

const dateFormatter = new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium' })

type Notice = { kind: 'success' | 'error'; message: string }
type StatusFilter = 'all' | 'active' | 'inactive'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Deshabilitados' },
]

interface VendorsTableProps {
  vendors: Vendor[]
  busyIds: Set<string>
  onEdit: (vendor: Vendor) => void
  onToggleActive: (vendor: Vendor) => void
  onResendOtp: (vendor: Vendor) => void
}

function VendorsTable({ vendors, busyIds, onEdit, onToggleActive, onResendOtp }: VendorsTableProps) {
  if (vendors.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>No hay vendedores que coincidan con el filtro.</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Correo</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Fecha de alta</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vendors.map((vendor) => {
          const busy = busyIds.has(vendor.id)
          return (
            <TableRow key={vendor.id} className={cn(!vendor.active && 'opacity-55')}>
              <TableCell className="font-medium text-foreground">{vendor.name}</TableCell>
              <TableCell className="text-muted-foreground">{vendor.email ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={vendor.active ? 'default' : 'outline'}>
                  {vendor.active ? 'Activo' : 'Deshabilitado'}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{dateFormatter.format(new Date(vendor.created_at))}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon-sm" disabled={busy} aria-label="Acciones">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem onSelect={() => onEdit(vendor)}>
                        <Pencil /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onToggleActive(vendor)}>
                        <Power /> {vendor.active ? 'Deshabilitar' : 'Habilitar'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => onResendOtp(vendor)}>
                        <KeyRound /> Reenviar código
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

/** RF-01 / HU-01: listado, alta, edición y habilitar/deshabilitar vendedores (wireframe 1k). */
export function VendorsPage() {
  const { state, reload } = useVendors()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [confirmingDisable, setConfirmingDisable] = useState<Vendor | null>(null)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState<Notice | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const vendors = state.status === 'ready' ? state.vendors : []
  const activeCount = vendors.filter((v) => v.active).length
  const inactiveCount = vendors.length - activeCount

  const filteredVendors = useMemo(() => {
    const query = search.trim().toLowerCase()
    return vendors.filter((vendor) => {
      if (statusFilter === 'active' && !vendor.active) return false
      if (statusFilter === 'inactive' && vendor.active) return false
      if (!query) return true
      return (
        vendor.name.toLowerCase().includes(query) || (vendor.email ?? '').toLowerCase().includes(query)
      )
    })
  }, [vendors, search, statusFilter])

  async function withBusy(id: string, task: () => Promise<void>) {
    setBusyIds((prev) => new Set(prev).add(id))
    try {
      await task()
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function applyStatusChange(vendor: Vendor, active: boolean) {
    setNotice(null)
    await withBusy(vendor.id, async () => {
      try {
        await setVendorActive(vendor.id, active)
        setNotice({
          kind: 'success',
          message: `${vendor.name}: ${active ? 'habilitado' : 'deshabilitado'}.`,
        })
        reload()
      } catch (err) {
        setNotice({
          kind: 'error',
          message: err instanceof ApiError ? err.message : 'No se pudo actualizar el estado del vendedor.',
        })
      }
    })
  }

  function handleToggleActive(vendor: Vendor) {
    if (vendor.active) {
      setConfirmingDisable(vendor)
      return
    }
    void applyStatusChange(vendor, true)
  }

  async function handleResendOtp(vendor: Vendor) {
    setNotice(null)
    await withBusy(vendor.id, async () => {
      try {
        await resendVendorOtp(vendor.id)
        setNotice({ kind: 'success', message: `Código reenviado a ${vendor.email ?? vendor.name}.` })
      } catch (err) {
        setNotice({
          kind: 'error',
          message: err instanceof ApiError ? err.message : 'No se pudo reenviar el código.',
        })
      }
    })
  }

  return (
    <AppShell>
      <PageHeader
        title="Vendedores"
        subtitle={state.status === 'ready' ? `${activeCount} activos · ${inactiveCount} deshabilitados` : undefined}
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" /> Nuevo vendedor
          </Button>
        }
      />

      {notice && (
        <div className="mb-4" role="status">
          {notice.kind === 'error' ? (
            <ErrorAlert>{notice.message}</ErrorAlert>
          ) : (
            <Alert>
              <CircleCheck />
              <AlertDescription>{notice.message}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {state.status === 'loading' && <LoadingNotice>Cargando vendedores…</LoadingNotice>}
      {state.status === 'error' && <ErrorAlert>{state.message}</ErrorAlert>}

      {state.status === 'ready' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchField value={search} onChange={setSearch} placeholder="Buscar por nombre o correo" />
            <FilterToggleGroup
              label="Estado"
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_FILTERS}
            />
          </div>

          <Card className="gap-0 py-0">
            <VendorsTable
              vendors={filteredVendors}
              busyIds={busyIds}
              onEdit={setEditing}
              onToggleActive={handleToggleActive}
              onResendOtp={handleResendOtp}
            />
          </Card>

          {/* <p className="text-sm text-muted-foreground">
            Deshabilitar corta el acceso del APK sin borrar el histórico de rutas del vendedor.
          </p> */}
        </div>
      )}

      {createOpen && (
        <CreateVendorDialog
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            reload()
          }}
        />
      )}

      {editing && (
        <EditVendorDialog
          vendor={editing}
          onClose={() => setEditing(null)}
          onUpdated={() => {
            setEditing(null)
            reload()
          }}
        />
      )}

      {confirmingDisable && (
        <ConfirmDialog
          title="Deshabilitar vendedor"
          message={`${confirmingDisable.name} no podrá iniciar sesión en la app móvil hasta que lo vuelvas a habilitar.`}
          confirmLabel="Deshabilitar"
          submitting={busyIds.has(confirmingDisable.id)}
          onCancel={() => setConfirmingDisable(null)}
          onConfirm={async () => {
            const vendor = confirmingDisable
            await applyStatusChange(vendor, false)
            setConfirmingDisable(null)
          }}
        />
      )}
    </AppShell>
  )
}
