import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { SalesUploadSummary } from './uploads.types'

function toPlainText(summary: SalesUploadSummary): string {
  return summary.rejections
    .map((r) => `Línea ${r.index}\tVenta ${r.erp_sale_id ?? '—'}\t${r.reason}`)
    .join('\n')
}

/**
 * Detalle de las ventas que el backend rechazó (bloque "Registros rechazados"
 * del wireframe `1m`). Solo se monta cuando hubo rechazos: un lote limpio no
 * debe cargar la pantalla con una tabla vacía.
 *
 * La tabla va abierta, no plegada: si algo se rechazó, es lo que el admin vino
 * a ver.
 *
 * Un rechazo no se corrige desde el CRM sino en Efactsoft, así que copiar y
 * descargar son el cierre real del flujo: el admin le pasa la lista a quien
 * mantiene el ERP.
 */
export function UploadRejectionsPanel({ summary }: { summary: SalesUploadSummary }) {
  const [copied, setCopied] = useState(false)

  async function copyDetail() {
    try {
      await navigator.clipboard.writeText(toPlainText(summary))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Sin portapapeles (contexto no seguro): el texto sigue visible en la
      // tabla y el CSV sigue disponible, así que no vale la pena interrumpir.
    }
  }

  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <h3 className="text-sm font-semibold">Registros rechazados</h3>

        {/* "Descargar reporte" no se repite aquí: vive en la fila de acciones
            del pie de la pantalla, como en el wireframe. */}
        <Button type="button" variant="outline" size="sm" onClick={copyDetail}>
          {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
          {copied ? 'Copiado' : 'Copiar detalle'}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Línea</TableHead>
              <TableHead className="w-28">Venta ERP</TableHead>
              <TableHead>Motivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.rejections.map((rejection) => (
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
      </div>

      <div className="flex flex-col gap-1 border-t px-3 py-2 text-xs text-muted-foreground">
        {summary.rejections_truncated > 0 && (
          <p>
            Se muestran las primeras {summary.rejections.length} de {summary.rejected} rechazadas;
            hay {summary.rejections_truncated} más registradas en el servidor.
          </p>
        )}
        <p>
          Estas ventas quedaron registradas en el servidor para auditoría, pero no se importaron al
          CRM. Corrígelas en Efactsoft y vuelve a exportar el archivo.
        </p>
      </div>
    </div>
  )
}
