import { useState } from 'react'
import { Check, ChevronDown, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { SaleRejection } from './uploads.types'

interface UploadRejectionsPanelProps {
  rejections: SaleRejection[]
  rejected: number
  rejectionsTruncated: number
}

function toPlainText(rejections: SaleRejection[]): string {
  return rejections
    .map((r) => `Índice ${r.index}\tVenta ${r.erp_sale_id ?? '—'}\t${r.reason}`)
    .join('\n')
}

/**
 * Detalle de las ventas que el backend rechazó. Se muestra solo cuando hubo
 * rechazos: un lote limpio no debe cargar la pantalla con una tabla vacía.
 *
 * Un rechazo no se corrige desde el CRM sino en Efactsoft, así que el botón
 * de copiar es el cierre real del flujo: el admin le pasa la lista a quien
 * mantiene el ERP.
 */
export function UploadRejectionsPanel({
  rejections,
  rejected,
  rejectionsTruncated,
}: UploadRejectionsPanelProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copyDetail() {
    try {
      await navigator.clipboard.writeText(toPlainText(rejections))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sin portapapeles (contexto no seguro): el texto sigue visible en la
      // tabla, así que no vale la pena interrumpir con un error.
    }
  }

  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
          {open ? 'Ocultar' : 'Ver'} {rejected === 1 ? 'la venta rechazada' : `las ${rejected} ventas rechazadas`}
        </Button>

        {open && rejections.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={copyDetail}>
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copiado' : 'Copiar detalle'}
          </Button>
        )}
      </div>

      {open && (
        <div className="border-t px-3 py-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Índice</TableHead>
                <TableHead className="w-28">Venta ERP</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rejections.map((rejection) => (
                <TableRow key={`${rejection.index}-${rejection.erp_sale_id ?? 'null'}`}>
                  <TableCell className="tabular-nums">{rejection.index}</TableCell>
                  <TableCell className="tabular-nums">{rejection.erp_sale_id ?? '—'}</TableCell>
                  {/* Sin traducir: es la salida del esquema de zod del backend
                      y el equipo del ERP la busca tal cual en los logs. */}
                  <TableCell className="font-mono text-xs">{rejection.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {rejectionsTruncated > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Se muestran las primeras {rejections.length} de {rejected} rechazadas; hay{' '}
              {rejectionsTruncated} más registradas en el servidor.
            </p>
          )}

          <p className="mt-2 text-xs text-muted-foreground">
            Estas ventas quedaron registradas en el servidor para auditoría, pero no se importaron
            al CRM. Corrígelas en Efactsoft y vuelve a exportar el archivo.
          </p>
        </div>
      )}
    </div>
  )
}
