import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChartColumn, Check, ChevronLeft, ChevronRight, Copy, Package, Search } from 'lucide-react'
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
import { productMetricsPath } from '../metrics/productMetricsLinks'
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
              <Skeleton className="ml-auto h-7 w-24 rounded-lg" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/** Los códigos del ERP llegan de hasta 23 dígitos: se cortan en la tabla y se copian completos. */
function CopyableCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sin portapapeles (contexto no seguro): el código sigue en el tooltip.
    }
  }

  return (
    <div className="flex items-center gap-1">
      <span className="max-w-28 truncate tabular-nums" title={code}>
        {code}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={copied ? 'Código copiado' : `Copiar código ${code}`}
        onClick={(e) => {
          e.stopPropagation()
          void copy()
        }}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  )
}

function ProductsTable({ products }: { products: Product[] }) {
  const navigate = useNavigate()

  return (
    <Table>
      <ProductsTableHead />
      <TableBody>
        {products.map((product) => (
          <TableRow
            key={product.erp_product_id}
            className="cursor-pointer"
            onClick={() => navigate(productMetricsPath(product.erp_product_id))}
          >
            <TableCell className="hidden text-muted-foreground sm:table-cell">
              {product.code ? <CopyableCode code={product.code} /> : '—'}
            </TableCell>
            <TableCell className="max-w-56 sm:max-w-80">
              <div className="truncate font-medium text-foreground">{product.name}</div>
              {product.code && <div className="truncate text-xs text-muted-foreground sm:hidden">{product.code}</div>}
            </TableCell>
            <TableCell className="hidden text-muted-foreground md:table-cell">{product.product_group ?? '—'}</TableCell>
            <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDate(product.last_seen_at)}</TableCell>
            <TableCell className="text-right">
              {/* El catálogo no tiene periodo: la ficha de métricas resuelve el suyo por defecto. */}
              <Button asChild variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
                <Link to={productMetricsPath(product.erp_product_id)}>
                  <ChartColumn data-icon="inline-start" /> Métricas
                </Link>
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
              <ProductsTable products={state.products} />
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

    </AppShell>
  )
}
