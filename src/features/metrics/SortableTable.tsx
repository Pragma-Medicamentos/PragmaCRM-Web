import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from 'cn'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import type { Money } from './metrics.types'
import { toAmount } from './metricsFormat'

/*
 * Tabla del panel de métricas que se reordena al hacer clic en un encabezado
 * (PCRM-180). Es la única copia de ese estado: las tablas concretas
 * (vendedores, clientes sin visita) solo declaran sus columnas.
 *
 * Mientras el usuario no toca un encabezado se respeta el orden de entrada
 * (el backend manda los vendedores por venta desc; cobertura preordena con
 * `byLastVisit`).
 */

export type SortDirection = 'asc' | 'desc'

/** `money` acepta el string decimal del backend ("118.00"); `date` espera un ISO. */
export type SortKind = 'text' | 'number' | 'money' | 'date'

export type SortValue = Money | number | null | undefined

export type ColumnSort<Row> =
  | { kind: SortKind; value: (row: Row) => SortValue }
  /** Escape para un orden que no sale de un solo valor. Ascendente tal cual, descendente invertido. */
  | { compare: (a: Row, b: Row) => number }

export interface SortableColumn<Row> {
  key: string
  label: ReactNode
  cell: (row: Row) => ReactNode
  /** Sin esto la columna no se puede ordenar (la del chevron de detalle, por ejemplo). */
  sort?: ColumnSort<Row>
  headClassName?: string
  cellClassName?: string
}

interface SortableTableProps<Row> {
  rows: Row[]
  columns: SortableColumn<Row>[]
  rowKey: (row: Row) => string
  onRowClick?: (row: Row) => void
  rowClassName?: string
  /** Para el encabezado fijo del listado de cobertura. */
  headerClassName?: string
}

const collator = new Intl.Collator('es-SV', { sensitivity: 'base', numeric: true })

/** Todo valor comparable se reduce a texto, número o `null` ("no hay dato", siempre al final). */
function normalize(kind: SortKind, value: SortValue): string | number | null {
  if (value === null || value === undefined) return null
  if (kind === 'text') return String(value)
  if (kind === 'date') {
    const time = Date.parse(String(value))
    return Number.isFinite(time) ? time : null
  }
  return toAmount(value)
}

function compareValues(kind: SortKind, a: string | number, b: string | number): number {
  if (kind === 'text') return collator.compare(String(a), String(b))
  return Number(a) - Number(b)
}

/** Nunca muta `rows`. Los `null` quedan al final en ambas direcciones. */
function sortRows<Row>(rows: Row[], sort: ColumnSort<Row>, direction: SortDirection): Row[] {
  const sign = direction === 'asc' ? 1 : -1

  if ('compare' in sort) return [...rows].sort((a, b) => sign * sort.compare(a, b))

  return [...rows].sort((a, b) => {
    const left = normalize(sort.kind, sort.value(a))
    const right = normalize(sort.kind, sort.value(b))
    if (left === null || right === null) {
      if (left === right) return 0
      return left === null ? 1 : -1
    }
    return sign * compareValues(sort.kind, left, right)
  })
}

export function SortableTable<Row>({
  rows,
  columns,
  rowKey,
  onRowClick,
  rowClassName,
  headerClassName,
}: SortableTableProps<Row>) {
  const [active, setActive] = useState<{ key: string; direction: SortDirection } | null>(null)

  const sorted = useMemo(() => {
    if (!active) return rows
    const sort = columns.find((column) => column.key === active.key)?.sort
    return sort ? sortRows(rows, sort, active.direction) : rows
  }, [rows, columns, active])

  function toggle(key: string) {
    setActive((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    )
  }

  return (
    <Table>
      <TableHeader className={headerClassName}>
        <TableRow>
          {columns.map((column) => {
            const current = active?.key === column.key ? active.direction : null
            return (
              <TableHead
                key={column.key}
                className={column.headClassName}
                aria-sort={current === 'asc' ? 'ascending' : current === 'desc' ? 'descending' : 'none'}
              >
                {column.sort ? (
                  <button
                    type="button"
                    onClick={() => toggle(column.key)}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-1 rounded-sm transition-colors select-none hover:text-foreground',
                      'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                      current && 'text-foreground'
                    )}
                  >
                    {column.label}
                    {current === 'asc' && <ChevronUp className="size-3.5 text-muted-foreground" aria-hidden />}
                    {current === 'desc' && <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />}
                  </button>
                ) : (
                  column.label
                )}
              </TableHead>
            )
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((row) => (
          <TableRow key={rowKey(row)} className={rowClassName} onClick={onRowClick && (() => onRowClick(row))}>
            {columns.map((column) => (
              <TableCell key={column.key} className={column.cellClassName}>
                {column.cell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
