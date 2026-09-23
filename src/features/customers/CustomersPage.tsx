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
  QuietTable,
  QuietTableBody,
  QuietTableCell,
  QuietTableHead,
  QuietTableHeader,
  QuietTableRow,
} from '../../components/quiet-table'
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

const COLUMNS: { label: string; align?: 'right'; numeric?: boolean }[] = [
  { label: 'Cliente' },
  { label: 'Zona' },
  { label: 'Categoría' },
  { label: 'Compras (neto)', align: 'right', numeric: true },
  { label: 'Conversión', align: 'right', numeric: true },
  { label: 'Días prom. pago', align: 'right', numeric: true },
  { label: 'Saldo', align: 'right', numeric: true },
  { label: 'GPS' },
]

function categoryLabel(category: CustomerCategory): string {
  return category === 'uncategorized' ? 'Sin categorizar' : category
}

function CustomersTableHead() {
  return (
    <QuietTableHeader>
      <QuietTableRow className="hover:bg-transparent">
        {COLUMNS.map((column) => (
          <QuietTableHead key={column.label} align={column.align}>
            {column.label}
          </QuietTableHead>
        ))}
        <QuietTableHead align="right">Acciones</QuietTableHead>
      </QuietTableRow>
    </QuietTableHeader>
  )
}

function CustomersTableSkeleton() {
  return (
    <QuietTable>
      <CustomersTableHead />
      <QuietTableBody>
        {Array.from({ length: 6 }, (_, row) => (
          <QuietTableRow key={row}>
            {COLUMNS.map((column) => (
              <QuietTableCell key={column.label} align={column.align} numeric={column.numeric}>
                <Skeleton className="h-4 w-20" />
              </QuietTableCell>
            ))}
            <QuietTableCell align="right">
              <Skeleton className="ml-auto h-7 w-20 rounded-lg" />
            </QuietTableCell>
          </QuietTableRow>
        ))}
      </QuietTableBody>
    </QuietTable>
  )
}

function CustomersTable({ customers }: { customers: Customer[] }) {
  return (
    <QuietTable>
      <CustomersTableHead />
      <QuietTableBody>
        {customers.map((customer) => {
          const balance = Number(customer.pending_balance)
          const hasBalance = Number.isFinite(balance) && balance > 0
          return (
            <QuietTableRow key={customer.id}>
              <QuietTableCell>
                <div className="font-medium text-foreground">{customer.name}</div>
                {customer.trade_name && (
                  <div className="text-sm text-muted-foreground">{customer.trade_name}</div>
                )}
                {!customer.active && <div className="text-sm text-muted-foreground">Inactivo</div>}
              </QuietTableCell>
              <QuietTableCell className="text-muted-foreground">{customer.zone ?? '—'}</QuietTableCell>
              <QuietTableCell>
                <Badge variant={CATEGORY_BADGE_VARIANT[customer.category]}>
                  {categoryLabel(customer.category)}
                </Badge>
              </QuietTableCell>
              <QuietTableCell numeric className="font-medium text-foreground">
                {formatCurrency(customer.net_purchases)}
              </QuietTableCell>
              <QuietTableCell align="right">
                <div className="font-medium text-foreground tabular-nums">
                  {Math.round(customer.conversion_rate * 100)}%
                </div>
                <div className="text-sm font-normal text-muted-foreground">
                  {customer.orders_count} pedidos · {customer.visits_count} visitas
                </div>
              </QuietTableCell>
              <QuietTableCell numeric className="text-muted-foreground">
                {customer.avg_payment_days != null ? `${customer.avg_payment_days} d` : '—'}
              </QuietTableCell>
              <QuietTableCell
                numeric
                className={hasBalance ? 'font-medium text-destructive' : 'text-muted-foreground'}
              >
                {formatCurrency(customer.pending_balance)}
              </QuietTableCell>
              <QuietTableCell>
                {customer.has_gps ? (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="size-4 text-primary" aria-hidden="true" />
                    Con GPS
                  </span>
                ) : (
                  <span className="text-muted-foreground">Sin GPS</span>
                )}
              </QuietTableCell>
              <QuietTableCell align="right" className="whitespace-nowrap">
                <Button asChild variant="ghost" size="sm">
                  <Link to={`/clientes/${customer.id}`}>Ver perfil</Link>
                </Button>
              </QuietTableCell>
            </QuietTableRow>
          )
        })}
      </QuietTableBody>
    </QuietTable>
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

            <CardContent className="min-w-0 border-t px-0">
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
