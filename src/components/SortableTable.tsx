import { type ComponentProps, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from 'cn'
import { TableHead } from './ui/table'

/*
 * Ordenación por columna para cualquier tabla (issue #40). La tabla declara,
 * por columna, de dónde sale el valor a comparar; `useTableSort` ordena las
 * filas y `SortableTableHead` pinta el encabezado clicable. Clic: primera
 * dirección → la contraria → sin ordenar (vuelve al orden que traían las filas,
 * que suele ser el orden de negocio: ranking de venta, nunca visitados primero…).
 */

export type SortDirection = 'asc' | 'desc'

/** `null`/`undefined` = sin dato: siempre al final, en cualquier dirección. */
export type SortValue = string | number | null | undefined

export interface SortColumn<T> {
  value: (row: T) => SortValue
  /** El primer clic ordena de mayor a menor (montos, conteos). Por defecto, A→Z / menor a mayor. */
  descFirst?: boolean
}

export interface SortState<K extends string> {
  key: K
  direction: SortDirection
}

export interface TableSort<K extends string> {
  sort: SortState<K> | null
  toggle: (key: K) => void
  /** Si la columna arranca en descendente; lo usa el encabezado para el aviso de accesibilidad. */
  descFirst: (key: K) => boolean
}

const collator = new Intl.Collator('es', { sensitivity: 'base', numeric: true })

function compareValues(a: SortValue, b: SortValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a < b ? -1 : a > b ? 1 : 0
  return collator.compare(String(a), String(b))
}

const isEmpty = (value: SortValue) =>
  value === null || value === undefined || value === '' || (typeof value === 'number' && Number.isNaN(value))

export function useTableSort<T, K extends string>(
  rows: T[],
  columns: Record<K, SortColumn<T>>
): TableSort<K> & { rows: T[] } {
  const [sort, setSort] = useState<SortState<K> | null>(null)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const { value } = columns[sort.key]
    const sign = sort.direction === 'asc' ? 1 : -1
    // Se calcula cada valor una vez; el índice deja el orden original en los empates.
    return rows
      .map((row, index) => ({ row, index, key: value(row) }))
      .sort((a, b) => {
        const aEmpty = isEmpty(a.key)
        const bEmpty = isEmpty(b.key)
        if (aEmpty || bEmpty) return aEmpty === bEmpty ? a.index - b.index : aEmpty ? 1 : -1
        return sign * compareValues(a.key, b.key) || a.index - b.index
      })
      .map(({ row }) => row)
    // `columns` suele declararse en línea: el orden solo depende de filas y criterio.
  }, [rows, sort])

  const descFirst = (key: K) => columns[key].descFirst ?? false

  const toggle = (key: K) =>
    setSort((current) => {
      const first: SortDirection = descFirst(key) ? 'desc' : 'asc'
      if (current?.key !== key) return { key, direction: first }
      if (current.direction === first) return { key, direction: first === 'asc' ? 'desc' : 'asc' }
      return null
    })

  return { rows: sorted, sort, toggle, descFirst }
}

interface SortableTableHeadProps<K extends string> extends Omit<ComponentProps<typeof TableHead>, 'onClick'> {
  column: K
  sorting: TableSort<K>
  /** Alinea el botón con las cifras de la columna. */
  align?: 'left' | 'right'
}

export function SortableTableHead<K extends string>({
  column,
  sorting,
  align = 'left',
  className,
  children,
  ...props
}: SortableTableHeadProps<K>) {
  const direction = sorting.sort?.key === column ? sorting.sort.direction : null
  const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ChevronsUpDown

  return (
    <TableHead
      aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}
      className={cn(align === 'right' && 'text-right', className)}
      {...props}
    >
      <button
        type="button"
        onClick={() => sorting.toggle(column)}
        className={cn(
          'group/sort -mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 uppercase outline-none',
          'hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
          direction && 'text-foreground',
          align === 'right' && 'flex-row-reverse'
        )}
      >
        {children}
        <Icon
          aria-hidden
          className={cn(
            'size-3.5 shrink-0',
            !direction && 'opacity-40 group-hover/sort:opacity-80 group-focus-visible/sort:opacity-80'
          )}
        />
        <span className="sr-only">
          {direction === null
            ? `, ordenar ${sorting.descFirst(column) ? 'de mayor a menor' : 'de menor a mayor'}`
            : direction === 'asc'
              ? ', orden ascendente'
              : ', orden descendente'}
        </span>
      </button>
    </TableHead>
  )
}
