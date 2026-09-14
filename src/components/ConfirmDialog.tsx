import { useEffect, useId } from 'react'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  submitting?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Modal de confirmación genérico, para acciones con consecuencia real (p. ej. deshabilitar un vendedor). */
export function ConfirmDialog({ title, message, confirmLabel, submitting, onConfirm, onCancel }: ConfirmDialogProps) {
  const titleId = useId()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel])

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId}>{title}</h2>
        <p className="modal__hint">{message}</p>
        <div className="modal__actions">
          <button type="button" className="button button--ghost" onClick={onCancel} disabled={submitting}>
            Cancelar
          </button>
          <button type="button" className="button button--primary" onClick={onConfirm} disabled={submitting}>
            {submitting ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
