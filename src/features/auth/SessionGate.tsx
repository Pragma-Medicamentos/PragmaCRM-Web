import { Spinner } from '@/components/ui/spinner'

export function SessionGate() {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center gap-4 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Spinner className="size-7" />
      <p className="text-sm">Verificando sesión…</p>
    </div>
  )
}
