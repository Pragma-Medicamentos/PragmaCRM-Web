import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import {
  ChartNoAxesColumn,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Search,
  UserCog,
} from 'lucide-react'
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
import { ApiError } from '../../lib/api/apiClient'
import { formatMoney } from '../metrics/metricsFormat'
import { useVendorsPage } from './useVendorsPage'
import { CreateVendorDialog } from './CreateVendorDialog'
import { EditVendorDialog } from './EditVendorDialog'
import { resendVendorOtp, setVendorActive } from './vendorsApi'
import type { UpdatedVendor, Vendor } from './vendors.types'

const dateFormatter = new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium' })

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

type StatusFilter = 'all' | 'active' | 'inactive'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Deshabilitados' },
]

const COLUMNS = [
  { label: 'Nombre', className: '' },
  { label: 'Correo', className: 'hidden sm:table-cell' },
  { label: 'Estado', className: '' },
  { label: 'Meta mensual', className: 'hidden lg:table-cell text-right' },
  { label: 'Fecha de alta', className: 'hidden md:table-cell' },
] as const

function VendorsTableSkeleton() {
  return (
    <Table>
      <TableHeader className="bg-muted/40">
        <TableRow>
          {COLUMNS.map((column) => (
            <TableHead key={column.label} className={column.className}>
              {column.label}
            </TableHead>
          ))}
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }, (_, row) => (
          <TableRow key={row}>
            {COLUMNS.map((column) => (
              <TableCell key={column.label} className={column.className}>
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
            <TableHead key={column.label} className={column.className}>
              {column.label}
            </TableHead>
          ))}
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {vendors.map((vendor) => {
          const busy = busyIds.has(vendor.id)
          return (
            <TableRow key={vendor.id} className={cn(!vendor.active && 'opacity-55')}>
              <TableCell className="max-w-44 sm:max-w-64">
                <Link
                  to={`/vendedores/${vendor.id}`}
                  className="block truncate font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {vendor.name}
                </Link>
                <div className="truncate text-xs text-muted-foreground sm:hidden">{vendor.email ?? '—'}</div>
              </TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">{vendor.email ?? '—'}</TableCell>
              <TableCell>
                <Badge variant={vendor.active ? 'default' : 'outline'}>
                  {vendor.active ? 'Activo' : 'Deshabilitado'}
                </Badge>
              </TableCell>
              <TableCell className="hidden text-right tabular-nums lg:table-cell">
                {vendor.current_goal ? formatMoney(vendor.current_goal) : <span className="text-muted-foreground">Sin meta</span>}
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">{dateFormatter.format(new Date(vendor.created_at))}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon-sm" disabled={busy} aria-label="Acciones">
                      {busy ? <Spinner /> : <MoreHorizontal />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild>
                        <Link to={`/vendedores/${vendor.id}`}>
                          <ChartNoAxesColumn /> Ver desempeño
                        </Link>
                      </DropdownMenuItem>
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
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [confirmingDisable, setConfirmingDisable] = useState<Vendor | null>(null)
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [searchInput])

  const { state, reload } = useVendorsPage({
    page,
    limit: PAGE_SIZE,
    active: statusFilter === 'all' ? undefined : statusFilter === 'active',
    search,
  })

  const vendors = state.status === 'ready' ? state.page.items : []
  const isFiltered = search !== '' || statusFilter !== 'all'

  // Deshabilitar al último de la página con el filtro "Activos" la deja vacía.
  const lastPage = state.status === 'ready' ? state.page.total_pages : 0
  useEffect(() => {
    if (lastPage > 0 && page > lastPage) setPage(lastPage)
  }, [page, lastPage])

  function clearFilters() {
    setSearchInput('')
    setSearch('')
    setStatusFilter('all')
    setPage(1)
  }

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
        await setVendorActive(vendor.id, active)
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
        await resendVendorOtp(vendor.id)
        toast.success(`Código reenviado a ${vendor.email ?? vendor.name}.`)
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'No se pudo reenviar el código.')
      }
    })
  }

  // PCRM-182: el correo ya quedó guardado aunque el envío falle, así que el
  // error no bloquea el modal; se avisa aquí con la opción de reenviar.
  function notifyAccessEmail(updated: UpdatedVendor) {
    if (updated.access_email === 'sent') {
      toast.success(`${updated.name}: habilitado. Se envió el código de acceso a ${updated.email}.`)
    } else if (updated.access_email === 'failed') {
      toast.error(`No se pudo enviar el correo de acceso a ${updated.email ?? updated.name}.`, {
        description: 'El correo quedó guardado. Puedes reenviar el código.',
        duration: Infinity,
        action: { label: 'Reenviar código', onClick: () => void handleResendOtp(updated) },
      })
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Vendedores"
        subtitle={
          state.status === 'ready'
            ? `${state.page.totals.active} activos · ${state.page.totals.inactive} deshabilitados`
            : undefined
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
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </InputGroup>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  spacing={0}
                  value={statusFilter}
                  onValueChange={(value) => {
                    if (!value) return
                    setStatusFilter(value as StatusFilter)
                    setPage(1)
                  }}
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

              {state.status === 'ready' && vendors.length > 0 && (
                <VendorsTable
                  vendors={vendors}
                  busyIds={busyIds}
                  onEdit={setEditing}
                  onToggleActive={handleToggleActive}
                  onResendOtp={handleResendOtp}
                />
              )}

              {state.status === 'ready' && vendors.length === 0 && (
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
                        onClick={clearFilters}
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

            {state.status === 'ready' && state.page.total > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-4 py-3 sm:px-6">
                <span className="text-sm text-muted-foreground">
                  Página {state.page.page} de {state.page.total_pages} · {state.page.total}{' '}
                  {state.page.total === 1 ? 'vendedor' : 'vendedores'}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={state.page.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft data-icon="inline-start" /> Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={state.page.page >= state.page.total_pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Siguiente <ChevronRight data-icon="inline-end" />
                  </Button>
                </div>
              </div>
            )}
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
          onUpdated={(updated) => {
            setEditing(null)
            notifyAccessEmail(updated)
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
