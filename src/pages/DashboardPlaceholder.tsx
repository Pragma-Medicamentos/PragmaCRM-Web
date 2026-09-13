import { AppShell } from '../components/AppShell'

export function DashboardPlaceholder() {
  return (
    <AppShell>
      <div className="placeholder">
        <p>
          Sesión de Administrador verificada.
          <br />
          Los módulos de gestión de clientes y rutas no están implementados todavía.
        </p>
      </div>
    </AppShell>
  )
}
