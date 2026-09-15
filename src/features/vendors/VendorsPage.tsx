import { useMemo, useState } from 'react'
import { KeyRound, MoreHorizontal, Pencil, Plus, Power, Search } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { cn } from '../../lib/utils'
import { supabase } from '../../lib/supabase/client'
import { ApiError } from '../../lib/api/apiClient'
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
    return <p className="py-10 text-center text-sm text-muted-foreground">No hay vendedores que coincidan con el filtro.</p>
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
                    <DropdownMenuItem onSelect={() => onEdit(vendor)}>
                      <Pencil /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onToggleActive(vendor)}>
                      <Power /> {vendor.active ? 'Deshabilitar' : 'Habilitar'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onResendOtp(vendor)}>
                      <KeyRound /> Reenviar código
                    </DropdownMenuItem>
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
        const { data } = await supabase.auth.getSession()
        await setVendorActive(data.session?.access_token ?? null, vendor.id, active)
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
        const { data } = await supabase.auth.getSession()
        await resendVendorOtp(data.session?.access_token ?? null, vendor.id)
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
            <Plus /> Nuevo vendedor
          </Button>
        }
      />

      {notice && (
        <p
          role="status"
          className={cn(
            'mb-4 rounded-lg border p-3 text-sm',
            notice.kind === 'error'
              ? 'border-destructive/20 bg-destructive/10 text-destructive'
              : 'border-primary/20 bg-primary/10 text-primary'
          )}
        >
          {notice.message}
        </p>
      )}

      {state.status === 'loading' && <p className="text-sm text-muted-foreground">Cargando vendedores…</p>}
      {state.status === 'error' && (
        <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </p>
      )}

      {state.status === 'ready' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nombre o correo"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex gap-1.5">
              {STATUS_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  size="sm"
                  variant={statusFilter === filter.value ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <VendorsTable
              vendors={filteredVendors}
              busyIds={busyIds}
              onEdit={setEditing}
              onToggleActive={handleToggleActive}
              onResendOtp={handleResendOtp}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Deshabilitar corta el acceso del APK sin borrar el histórico de rutas del vendedor.
          </p>
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
