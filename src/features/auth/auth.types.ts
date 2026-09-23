// Ancla: app_user.role (tabla real). El DER en español la llama `usuario`.
export type AppUserRole = 'Administrador' | 'Vendedor'

// Forma de GET /api/v1/me (data del envelope). Ver PragmaCRM-Web/CLAUDE.md.
export interface AppUser {
  id: string
  authUserId: string
  role: AppUserRole
  name: string
  email: string | null
  passwordSetAt: string | null
}

// Motivo por el que AdminRoute devolvió a /login, usado por LoginPage
// para mostrar el mensaje correcto. 'forbidden' viene de un 403 real de
// la API (usuario no registrado, deshabilitado, etc.) y trae el message
// tal cual lo mandó el backend. 'role' es un gate propio de este
// dashboard (RF-01: un vendedor no entra al panel web) — /api/v1/me no
// lo rechaza, así que el mensaje se genera acá. 'expired' es una sesión
// que la API dejó de aceptar (401 en cualquier llamada) y que el
// interceptor de apiClient.ts cerró.
export type RedirectReason = { kind: 'forbidden'; message: string } | { kind: 'role' } | { kind: 'expired' }
