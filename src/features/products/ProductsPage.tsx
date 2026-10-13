import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Package, Search } from 'lucide-react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/PageHeader'
import { PendingBackendNotice } from '../../components/PendingBackendNotice'
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader } from '../../components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '../../components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../../components/ui/input-group'
import { Skeleton } from '../../components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import { ProductDetailSheet } from './ProductDetailSheet'
import { useProducts } from './useProducts'
import type { Product } from './products.types'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

const dateFormatter = new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium' })

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date)
}

const COLUMNS = [
  { label: 'Código', className: 'hidden sm:table-cell' },
  { label: 'Nombre', className: '' },
  { label: 'Grupo', className: 'hidden md:table-cell' },
  { label: 'Última vez visto', className: 'hidden lg:table-cell' },
] as const

function ProductsTableHead() {
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

function ProductsTableSkeleton() {
  return (
    <Table>
      <ProductsTableHead />
      <TableBody>
        {Array.from({ length: 6 }, (_, row) => (
          <TableRow key={row}>
            {COLUMNS.map((column) => (
              <TableCell key={column.label} className={column.className}>
                <Skeleton className="h-4 w-24" />
              </TableCell>
            ))}
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-7 w-16 rounded-lg" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ProductsTable({ products, onView }: { products: Product[]; onView: (id: number) => void }) {
  return (
    <Table>
      <ProductsTableHead />
      <TableBody>
        {products.map((product) => (
          <TableRow
            key={product.erp_product_id}
            className="cursor-pointer"
            onClick={() => onView(product.erp_product_id)}
          >
            <TableCell className="hidden text-muted-foreground sm:table-cell">{product.code ?? '—'}</TableCell>
            <TableCell className="max-w-56 sm:max-w-80">
              <div className="truncate font-medium text-foreground">{product.name}</div>
              {product.code && <div className="truncate text-xs text-muted-foreground sm:hidden">{product.code}</div>}
            </TableCell>
            <TableCell className="hidden text-muted-foreground md:table-cell">{product.product_group ?? '—'}</TableCell>
            <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDate(product.last_seen_at)}</TableCell>
            <TableCell className="text-right">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onView(product.erp_product_id)
                }}
              >
                Ver
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** PCRM-149: catálogo de productos, solo lectura (Api PCRM-148, PR #34). */
export function ProductsPage() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [searchInput])

  const { state } = useProducts({ page, limit: PAGE_SIZE, search })

  const isFiltered = search !== ''

  return (
    <AppShell>
      <PageHeader
        title="Productos"
        subtitle={state.status === 'ready' ? `${state.total} productos en el catálogo` : undefined}
      />

      {state.status === 'pending-backend' && <PendingBackendNotice endpoints={['GET /api/v1/products']} />}

      {state.status === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>No se pudo cargar el listado</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {(state.status === 'loading' || state.status === 'ready') && (
        <Card>
          <CardHeader>
            <InputGroup>
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                placeholder="Buscar por código o nombre"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </InputGroup>
          </CardHeader>

          <CardContent className="border-t px-0">
            {state.status === 'loading' && <ProductsTableSkeleton />}

            {state.status === 'ready' && state.products.length > 0 && (
              <ProductsTable products={state.products} onView={setSelectedProductId} />
            )}

            {state.status === 'ready' && state.products.length === 0 && (
              <Empty className="py-14">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Package />
                  </EmptyMedia>
                  <EmptyTitle>{isFiltered ? `Sin resultados para "${search}"` : 'No hay productos'}</EmptyTitle>
                  <EmptyDescription>
                    {isFiltered
                      ? 'Probá con otro código o nombre.'
                      : 'El catálogo llega al CRM con la importación desde el ERP.'}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>

          {state.status === 'ready' && state.total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-4 py-3 sm:px-6">
              <span className="text-sm text-muted-foreground">
                Página {state.page} de {state.totalPages} · {state.total} productos
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={state.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft data-icon="inline-start" /> Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={state.page >= state.totalPages}
                  onClick={() => setPage((p) => Math.min(state.totalPages, p + 1))}
                >
                  Siguiente <ChevronRight data-icon="inline-end" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      <ProductDetailSheet
        productId={selectedProductId}
        onOpenChange={(open) => {
          if (!open) setSelectedProductId(null)
        }}
      />
    </AppShell>
  )
}
