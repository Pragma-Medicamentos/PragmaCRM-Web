import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  submitting?: boolean
  /** Botón de confirmación en rojo, para acciones que quitan algo (p. ej. eliminar una ruta). */
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Modal de confirmación genérico, para acciones con consecuencia real (p. ej. deshabilitar un vendedor). */
export function ConfirmDialog({ title, message, confirmLabel, submitting, destructive, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Procesando…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
