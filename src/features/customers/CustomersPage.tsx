import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, MapPinOff, Search, Users } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { PendingBackendNotice } from '../../components/PendingBackendNotice'
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
import { ToggleGroup, ToggleGroupItem } from '../../components/ui/toggle-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { cn } from '../../lib/utils'
import { useCustomers } from './useCustomers'
import type { Customer, CustomerCategory } from './customers.types'

const currencyFormatter = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' })

function formatCurrency(value: string): string {
  const amount = Number(value)
  return Number.isFinite(amount) ? currencyFormatter.format(amount) : '—'
}

type CategoryFilter = 'all' | CustomerCategory

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'uncategorized', label: 'Sin categorizar' },
]

const CATEGORY_BADGE_VARIANT: Record<CustomerCategory, 'default' | 'secondary' | 'outline'> = {
  A: 'default',
  B: 'secondary',
  C: 'outline',
  uncategorized: 'outline',
}

// Columnas prioritarias siempre visibles (Cliente, Categoría, Acciones); el
// resto aparece al ganar ancho. Debajo de lg el sidebar es un Sheet, así que
// los saltos no siguen 1:1 al viewport (≥lg el sidebar vuelve a ocupar ancho).
const COLUMNS = [
  { label: 'Cliente', className: '' },
  { label: 'Zona', className: 'hidden md:table-cell' },
  { label: 'Categoría', className: '' },
  { label: 'Compras (neto)', className: 'hidden sm:table-cell' },
  { label: 'Conversión', className: 'hidden xl:table-cell' },
  { label: 'Días prom. pago', className: 'hidden 2xl:table-cell' },
  { label: 'Saldo', className: 'hidden md:table-cell' },
  { label: 'GPS', className: 'hidden md:table-cell' },
] as const

function categoryLabel(category: CustomerCategory): string {
  return category === 'uncategorized' ? 'Sin categorizar' : category
}

function CustomersTableHead() {
  return (
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
  )
}

function CustomersTableSkeleton() {
  return (
    <Table>
      <CustomersTableHead />
      <TableBody>
        {Array.from({ length: 6 }, (_, row) => (
          <TableRow key={row}>
            {COLUMNS.map((column) => (
              <TableCell key={column.label} className={column.className}>
                <Skeleton className="h-4 w-20" />
              </TableCell>
            ))}
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-7 w-20 rounded-lg" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function CustomersTable({ customers }: { customers: Customer[] }) {
  return (
    <Table>
      <CustomersTableHead />
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.id} className={cn(!customer.active && 'opacity-55')}>
            <TableCell className="max-w-48 sm:max-w-64">
              <div className="truncate font-medium text-foreground">{customer.name}</div>
              {customer.trade_name && <div className="truncate text-xs text-muted-foreground">{customer.trade_name}</div>}
              {customer.zone && <div className="truncate text-xs text-muted-foreground md:hidden">{customer.zone}</div>}
            </TableCell>
            <TableCell className="hidden text-muted-foreground md:table-cell">{customer.zone ?? '—'}</TableCell>
            <TableCell>
              <Badge variant={CATEGORY_BADGE_VARIANT[customer.category]}>{categoryLabel(customer.category)}</Badge>
            </TableCell>
            <TableCell className="hidden tabular-nums text-muted-foreground sm:table-cell">
              {formatCurrency(customer.net_purchases)}
            </TableCell>
            <TableCell className="hidden tabular-nums text-muted-foreground xl:table-cell">
              {Math.round(customer.conversion_rate * 100)}%
              <div className="text-xs">
                {customer.orders_count}/{customer.visits_count}
              </div>
            </TableCell>
            <TableCell className="hidden tabular-nums text-muted-foreground 2xl:table-cell">
              {customer.avg_payment_days != null ? `${customer.avg_payment_days} d` : '—'}
            </TableCell>
            <TableCell className="hidden tabular-nums text-muted-foreground md:table-cell">
              {formatCurrency(customer.pending_balance)}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              {customer.has_gps ? (
                <MapPin className="size-4 text-primary" aria-label="Con ubicación GPS" />
              ) : (
                <span className="text-xs text-muted-foreground">falta</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <Button asChild variant="outline" size="sm">
                <Link to={`/clientes/${customer.id}`}>Ver perfil</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** RF-02: listado de clientes, punto de entrada al perfil (`/clientes/:id`) (wireframe 1n). */
export function CustomersPage() {
  const { state } = useCustomers()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [onlyMissingGps, setOnlyMissingGps] = useState(false)

  const customers = state.status === 'ready' ? state.customers : []
  const missingGpsCount = customers.filter((c) => !c.has_gps).length

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return customers.filter((customer) => {
      if (categoryFilter !== 'all' && customer.category !== categoryFilter) return false
      if (onlyMissingGps && customer.has_gps) return false
      if (!query) return true
      return (
        customer.name.toLowerCase().includes(query) ||
        (customer.trade_name ?? '').toLowerCase().includes(query) ||
        String(customer.erp_customer_id ?? '').includes(query)
      )
    })
  }, [customers, search, categoryFilter, onlyMissingGps])

  const isFiltered = search.trim() !== '' || categoryFilter !== 'all' || onlyMissingGps

  function clearFilters() {
    setSearch('')
    setCategoryFilter('all')
    setOnlyMissingGps(false)
  }

  return (
    <AppShell>
      <PageHeader
        title="Clientes"
        subtitle={
          state.status === 'ready'
            ? `${customers.length} perfiles importados de Efactsoft · ${missingGpsCount} sin ubicación GPS`
            : undefined
        }
      />

      {state.status === 'pending-backend' && <PendingBackendNotice endpoints={['GET /api/v1/customers']} />}

      {state.status === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar el listado</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {(state.status === 'loading' || state.status === 'ready') && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <InputGroup className="flex-1">
                    <InputGroupAddon>
                      <Search />
                    </InputGroupAddon>
                    <InputGroupInput
                      type="search"
                      placeholder="Buscar por nombre o nombre comercial"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      disabled={state.status !== 'ready'}
                    />
                  </InputGroup>
                  <Button
                    type="button"
                    size="sm"
                    variant={onlyMissingGps ? 'default' : 'outline'}
                    disabled={state.status !== 'ready'}
                    onClick={() => setOnlyMissingGps((v) => !v)}
                  >
                    <MapPinOff data-icon="inline-start" /> Sin GPS ({missingGpsCount})
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Categoría:</span>
                  <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    spacing={0}
                    value={categoryFilter}
                    onValueChange={(value) => value && setCategoryFilter(value as CategoryFilter)}
                    disabled={state.status !== 'ready'}
                  >
                    {CATEGORY_FILTERS.map((filter) => (
                      <ToggleGroupItem key={filter.value} value={filter.value}>
                        {filter.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>
            </CardHeader>

            <CardContent className="border-t px-0">
              {state.status === 'loading' && <CustomersTableSkeleton />}

              {state.status === 'ready' && filteredCustomers.length > 0 && (
                <CustomersTable customers={filteredCustomers} />
              )}

              {state.status === 'ready' && filteredCustomers.length === 0 && (
                <Empty className="py-14">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Users />
                    </EmptyMedia>
                    <EmptyTitle>
                      {isFiltered ? 'Ningún cliente coincide' : 'Todavía no hay clientes'}
                    </EmptyTitle>
                    <EmptyDescription>
                      {isFiltered
                        ? 'Probá con otro término de búsqueda o quitá los filtros de categoría y GPS.'
                        : 'Los clientes llegan al CRM con la importación del archivo de ventas de Efactsoft.'}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    {isFiltered ? (
                      <Button type="button" variant="outline" onClick={clearFilters}>
                        Limpiar filtros
                      </Button>
                    ) : (
                      <Button asChild>
                        <Link to="/importar">Importar datos</Link>
                      </Button>
                    )}
                  </EmptyContent>
                </Empty>
              )}
            </CardContent>
          </Card>

          <p className="text-sm text-muted-foreground">
            La categoría A/B/C se calcula automáticamente a partir de compras netas, conversión y días promedio de
            pago.
          </p>
        </div>
      )}
    </AppShell>
  )
}
