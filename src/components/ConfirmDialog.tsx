import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Spinner } from '@/components/ui/spinner'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  submitting?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Confirmación para acciones con consecuencia real (p. ej. deshabilitar un vendedor). */
export function ConfirmDialog({ title, message, confirmLabel, submitting, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && !submitting && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
          {/* Botón común y no AlertDialogAction: éste cierra el diálogo al hacer
              clic y aquí tiene que quedar abierto, mostrando el progreso, hasta
              que termine la petición. */}
          <Button type="button" onClick={onConfirm} disabled={submitting}>
            {submitting && <Spinner data-icon="inline-start" />}
            {submitting ? 'Procesando…' : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
