/**
 * Fila del ChartTooltipContent de shadcn con el valor ya formateado (dinero,
 * días…). El contenido por defecto usa `toLocaleString()` y perdería el "$".
 * Mismas medidas que la fila original: indicador de 10px, etiqueta en muted.
 */
export function ChartTooltipRow({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex w-full items-center gap-2">
      {color && <div className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: color }} />}
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto pl-3 font-medium text-foreground tabular-nums">{value}</span>
    </div>
  )
}
