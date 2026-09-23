import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { KeyRound, MoreHorizontal, Pencil, Plus, Power, Search, UserCog } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../../components/ui/empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '../../components/ui/input-group'
import { Badge } from '../../components/ui/badge'
import { Skeleton } from '../../components/ui/skeleton'
import { Spinner } from '../../components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group'
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
  DropdownMenuGroup,
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

type StatusFilter = 'all' | 'active' | 'inactive'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Deshabilitados' },
]

const COLUMNS = ['Nombre', 'Correo', 'Estado', 'Fecha de alta'] as const

function VendorsTableSkeleton() {
  return (
    <Table>
      <TableHeader className="bg-muted/40">
        <TableRow>
          {COLUMNS.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }, (_, row) => (
          <TableRow key={row}>
            {COLUMNS.map((column) => (
              <TableCell key={column}>
                <Skeleton className="h-4 w-28" />
              </TableCell>
            ))}
            <TableCell className="text-right">
              <Skeleton className="ml-auto size-7 rounded-lg" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

interface VendorsTableProps {
  vendors: Vendor[]
  busyIds: Set<string>
  onEdit: (vendor: Vendor) => void
  onToggleActive: (vendor: Vendor) => void
  onResendOtp: (vendor: Vendor) => void
}

function VendorsTable({ vendors, busyIds, onEdit, onToggleActive, onResendOtp }: VendorsTableProps) {
  return (
    <Table>
      <TableHeader className="bg-muted/40">
        <TableRow>
          {COLUMNS.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
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
                      {busy ? <Spinner /> : <MoreHorizontal />}
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

  const isFiltered = search.trim() !== '' || statusFilter !== 'all'

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
    await withBusy(vendor.id, async () => {
      try {
        const { data } = await supabase.auth.getSession()
        await setVendorActive(data.session?.access_token ?? null, vendor.id, active)
        toast.success(`${vendor.name}: ${active ? 'habilitado' : 'deshabilitado'}.`)
        reload()
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : 'No se pudo actualizar el estado del vendedor.'
        )
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
    await withBusy(vendor.id, async () => {
      try {
        const { data } = await supabase.auth.getSession()
        await resendVendorOtp(data.session?.access_token ?? null, vendor.id)
        toast.success(`Código reenviado a ${vendor.email ?? vendor.name}.`)
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'No se pudo reenviar el código.')
      }
    })
  }

  return (
    <AppShell>
      <PageHeader
        title="Vendedores"
        subtitle={
          state.status === 'ready' ? `${activeCount} activos · ${inactiveCount} deshabilitados` : undefined
        }
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus data-icon="inline-start" /> Nuevo vendedor
          </Button>
        }
      />

      {state.status === 'error' ? (
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar el listado</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <InputGroup className="flex-1">
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  <InputGroupInput
                    type="search"
                    placeholder="Buscar por nombre o correo"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    disabled={state.status !== 'ready'}
                  />
                </InputGroup>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  spacing={0}
                  value={statusFilter}
                  onValueChange={(value) => value && setStatusFilter(value as StatusFilter)}
                  disabled={state.status !== 'ready'}
                >
                  {STATUS_FILTERS.map((filter) => (
                    <ToggleGroupItem key={filter.value} value={filter.value}>
                      {filter.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </CardHeader>

            <CardContent className="border-t px-0">
              {state.status === 'loading' && <VendorsTableSkeleton />}

              {state.status === 'ready' && filteredVendors.length > 0 && (
                <VendorsTable
                  vendors={filteredVendors}
                  busyIds={busyIds}
                  onEdit={setEditing}
                  onToggleActive={handleToggleActive}
                  onResendOtp={handleResendOtp}
                />
              )}

              {state.status === 'ready' && filteredVendors.length === 0 && (
                <Empty className="py-14">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <UserCog />
                    </EmptyMedia>
                    <EmptyTitle>
                      {isFiltered ? 'Ningún vendedor coincide' : 'Todavía no hay vendedores'}
                    </EmptyTitle>
                    <EmptyDescription>
                      {isFiltered
                        ? 'Probá con otro término de búsqueda o quitá el filtro de estado.'
                        : 'Dá de alta al primero: la cuenta nace sin contraseña y recibe un código por correo.'}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    {isFiltered ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSearch('')
                          setStatusFilter('all')
                        }}
                      >
                        Limpiar filtros
                      </Button>
                    ) : (
                      <Button type="button" onClick={() => setCreateOpen(true)}>
                        <Plus data-icon="inline-start" /> Nuevo vendedor
                      </Button>
                    )}
                  </EmptyContent>
                </Empty>
              )}
            </CardContent>
          </Card>

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
