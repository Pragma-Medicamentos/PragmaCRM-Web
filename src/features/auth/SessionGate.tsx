export function SessionGate() {
  return (
    <div className="session-gate" role="status" aria-live="polite">
      <span className="session-gate__spinner" aria-hidden="true" />
      <p>Verificando sesión…</p>
    </div>
  )
}
