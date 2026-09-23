import { Spinner } from '../../components/ui/spinner'

export function SessionGate() {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-surface text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Spinner className="size-7 text-primary" />
      <p className="text-sm">Verificando sesión…</p>
    </div>
  )
}
