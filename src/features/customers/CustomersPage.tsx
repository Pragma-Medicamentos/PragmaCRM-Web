import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, MapPinOff, SearchX } from 'lucide-react'
import { AppShell } from '@/components/AppShell'
import { PageHeader } from '@/components/PageHeader'
import { PendingBackendNotice } from '@/components/PendingBackendNotice'
import { ErrorAlert } from '@/components/ErrorAlert'
import { FilterToggleGroup } from '@/components/FilterToggleGroup'
import { LoadingNotice } from '@/components/LoadingNotice'
import { SearchField } from '@/components/SearchField'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
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

function categoryLabel(category: CustomerCategory): string {
  return category === 'uncategorized' ? 'Sin categorizar' : category
}

function CustomersTable({ customers }: { customers: Customer[] }) {
  if (customers.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>No hay clientes que coincidan con el filtro.</EmptyTitle>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Zona</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Compras (neto)</TableHead>
          <TableHead>Conversión</TableHead>
          <TableHead>Días prom. pago</TableHead>
          <TableHead>Saldo</TableHead>
          <TableHead>GPS</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.id} className={cn(!customer.active && 'opacity-55')}>
            <TableCell>
              <div className="font-medium text-foreground">{customer.name}</div>
              {customer.trade_name && <div className="text-xs text-muted-foreground">{customer.trade_name}</div>}
            </TableCell>
            <TableCell className="text-muted-foreground">{customer.zone ?? '—'}</TableCell>
            <TableCell>
              <Badge variant={CATEGORY_BADGE_VARIANT[customer.category]}>{categoryLabel(customer.category)}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{formatCurrency(customer.net_purchases)}</TableCell>
            <TableCell className="text-muted-foreground">
              {Math.round(customer.conversion_rate * 100)}%
              <div className="text-xs">
                {customer.orders_count}/{customer.visits_count}
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {customer.avg_payment_days != null ? `${customer.avg_payment_days} d` : '—'}
            </TableCell>
            <TableCell className="text-muted-foreground">{formatCurrency(customer.pending_balance)}</TableCell>
            <TableCell>
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

      {state.status === 'loading' && <LoadingNotice>Cargando clientes…</LoadingNotice>}
      {state.status === 'pending-backend' && <PendingBackendNotice endpoints={['GET /api/v1/customers']} />}
      {state.status === 'error' && <ErrorAlert>{state.message}</ErrorAlert>}

      {state.status === 'ready' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre o nombre comercial"
            />
            <Button
              type="button"
              variant={onlyMissingGps ? 'default' : 'outline'}
              aria-pressed={onlyMissingGps}
              onClick={() => setOnlyMissingGps((v) => !v)}
            >
              <MapPinOff data-icon="inline-start" /> Sin GPS ({missingGpsCount})
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Categoría:</span>
            <FilterToggleGroup
              label="Categoría"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={CATEGORY_FILTERS}
            />
          </div>

          <Card className="gap-0 py-0">
            <CustomersTable customers={filteredCustomers} />
          </Card>

          {/* <p className="text-sm text-muted-foreground">
            La categoría A/B/C se calcula automáticamente a partir de compras netas, conversión y días promedio de
            pago.
          </p> */}
        </div>
      )}
    </AppShell>
  )
}
