import { useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../components/ui/sheet'
import type { MetricsRange, SellerPerformance } from './metrics.types'
import { type ComparisonTarget, formatRange } from './metricsDates'
import { formatCount } from './metricsFormat'
import { SellerPerformanceBody, useSellerDetail } from './SellerPerformance'

interface SellerDetailSheetProps {
  /** Fila del listado: pinta el encabezado y las cifras mientras llega el detalle. */
  seller: SellerPerformance | null
  range: MetricsRange
  /** Periodo que los gráficos del detalle dibujan en gris; `null` sin comparar. */
  comparison: ComparisonTarget | null
  onOpenChange: (open: boolean) => void
}

/**
 * Detalle de un vendedor (wireframe 1f, "fila expandible") en un panel
 * lateral. El contenido es el mismo de la página /vendedores/:id.
 */
export function SellerDetailSheet({ seller, range, comparison, onOpenChange }: SellerDetailSheetProps) {
  // Se conserva el último vendedor para que el contenido no desaparezca
  // durante la animación de cierre.
  const [shown, setShown] = useState(seller)
  if (seller && seller !== shown) setShown(seller)

  const queries = useSellerDetail(shown?.user_id ?? null, range, comparison)
  const current = queries.detail.state.status === 'ready' ? queries.detail.state.data.seller : shown

  return (
    <Sheet open={seller !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-xl">
        {current && (
          <>
            <SheetHeader className="pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-lg">{current.name}</SheetTitle>
                {!current.active && <Badge variant="outline">Deshabilitado</Badge>}
              </div>
              <SheetDescription>
                {formatCount(current.portfolio_customers)} clientes en cartera · {formatRange(range)}
              </SheetDescription>
            </SheetHeader>

            <div className="px-4 pb-6">
              <SellerPerformanceBody seller={current} range={range} comparison={comparison} {...queries} />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
