import type { ComponentProps } from 'react'
import { cn } from '../lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'

/**
 * Tabla de lectura del panel: misma primitiva que el resto de shadcn, con la
 * jerarquía del resumen (rótulos en frase, cifras alineadas, aire entre filas).
 * No cambia columnas ni datos; solo cómo se leen.
 */
export function QuietTable({ className, ...props }: ComponentProps<typeof Table>) {
  return <Table className={cn('w-full', className)} {...props} />
}

export function QuietTableHeader({ className, ...props }: ComponentProps<typeof TableHeader>) {
  return <TableHeader className={cn('bg-transparent', className)} {...props} />
}

export function QuietTableBody(props: ComponentProps<typeof TableBody>) {
  return <TableBody {...props} />
}

export function QuietTableRow({ className, ...props }: ComponentProps<typeof TableRow>) {
  return <TableRow className={cn('border-border/70 hover:bg-primary/[0.04]', className)} {...props} />
}

export function QuietTableHead({
  className,
  align = 'left',
  ...props
}: ComponentProps<typeof TableHead> & { align?: 'left' | 'right' }) {
  return (
    <TableHead
      className={cn(
        'h-12 px-4 text-sm font-medium whitespace-normal normal-case tracking-normal text-muted-foreground',
        align === 'right' && 'text-right',
        className
      )}
      {...props}
    />
  )
}

export function QuietTableCell({
  className,
  align = 'left',
  numeric = false,
  ...props
}: ComponentProps<typeof TableCell> & { align?: 'left' | 'right'; numeric?: boolean }) {
  return (
    <TableCell
      className={cn(
        'px-4 py-4 align-middle whitespace-normal',
        (align === 'right' || numeric) && 'text-right whitespace-nowrap tabular-nums',
        className
      )}
      {...props}
    />
  )
}
