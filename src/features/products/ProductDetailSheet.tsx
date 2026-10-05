import { Link } from 'react-router-dom'
import { ChartColumn } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { productMetricsPath } from '../metrics/productMetricsLinks'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet'
import { Skeleton } from '../../components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '../../components/ui/alert'
import { useProduct } from './useProducts'

const dateTimeFormatter = new Intl.DateTimeFormat('es-SV', { dateStyle: 'medium', timeStyle: 'short' })

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date)
}

interface DetailRowProps {
  label: string
  value: string
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b py-2.5 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

interface ProductDetailSheetProps {
  productId: number | null
  onOpenChange: (open: boolean) => void
}

/** Detalle de un producto del catálogo (GET /api/v1/products/:id), en un drawer. */
export function ProductDetailSheet({ productId, onOpenChange }: ProductDetailSheetProps) {
  const state = useProduct(productId)

  return (
    <Sheet open={productId != null} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Detalle del producto</SheetTitle>
          <SheetDescription>Información importada del catálogo ERP.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-1 px-4">
          {state.status === 'loading' && (
            <div className="flex flex-col gap-3 py-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          )}

          {state.status === 'error' && (
            <Alert variant="destructive">
              <AlertTitle>No se pudo cargar el producto</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          {state.status === 'ready' && (
            <>
              <DetailRow label="Código ERP" value={String(state.product.erp_product_id)} />
              <DetailRow label="Código" value={state.product.code ?? '—'} />
              <DetailRow label="Nombre" value={state.product.name} />
              <DetailRow label="Grupo" value={state.product.product_group ?? '—'} />
              <DetailRow label="Última vez visto" value={formatDateTime(state.product.last_seen_at)} />
              <DetailRow label="Creado" value={formatDateTime(state.product.created_at)} />
              <DetailRow label="Actualizado" value={formatDateTime(state.product.updated_at)} />
              {/* Las cifras de venta viven aparte (PCRM-177): este detalle es solo catálogo. */}
              <Button asChild variant="outline" className="mt-4">
                <Link to={productMetricsPath(state.product.erp_product_id)}>
                  <ChartColumn data-icon="inline-start" /> Ver métricas del producto
                </Link>
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
