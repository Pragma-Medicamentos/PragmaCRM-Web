import { cn } from 'cn'

export interface ComparisonLegendItem {
  label: string
  /** Total del periodo ya formateado; se omite si no aplica. */
  value?: string
  /** El periodo de comparación: trazo gris (punteado en líneas). */
  compare?: boolean
}

/** Leyenda de un gráfico comparado: qué es cada serie y, si aplica, cuánto suma. */
export function ComparisonLegend({ items, className }: { items: ComparisonLegendItem[]; className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-muted-foreground', className)}>
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn(
              'h-2.5 w-4 shrink-0 rounded-[2px]',
              item.compare ? 'bg-muted-foreground/35' : 'bg-(--chart-1)'
            )}
          />
          <span>{item.label}</span>
          {item.value && <span className="font-medium text-foreground tabular-nums">{item.value}</span>}
        </div>
      ))}
    </div>
  )
}
