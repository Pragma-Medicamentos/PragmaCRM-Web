import { SignIn } from '@clerk/clerk-react'
import { useLocation } from 'react-router-dom'
import type { RedirectReason } from './auth.types'

function reasonMessage(reason: RedirectReason): string {
  // 'forbidden' trae el message tal cual lo mandó la API en el 403
  // (usuario no registrado, cuenta deshabilitada, etc.) — ver
  // PragmaCRM-Web/CLAUDE.md. 'role' es el único mensaje que genera este
  // repo, porque /api/v1/me no rechaza por rol.
  return reason.kind === 'forbidden' ? reason.message : 'Esta cuenta no tiene permisos de Administrador.'
}

export function LoginPage() {
  const location = useLocation()
  const reason = (location.state as { reason?: RedirectReason } | null)?.reason

  return (
    <div className="login">
      <aside className="login__panel">
        <span className="login__brand">Pragma CRM</span>
        <p className="login__tagline">Panel de administración de Droguería Pragma.</p>
        <RouteMark />
      </aside>

      <main className="login__form-area">
        <div className="login__form-card">
          {reason && (
            <p className="login__banner" role="alert">
              {reasonMessage(reason)}
            </p>
          )}

          {/*
            routing="hash" evita tener que declarar rutas adicionales
            para las pantallas internas de Clerk (verificación, etc.)
            mientras el router de la app solo conoce "/login".
          */}
          <SignIn
            routing="hash"
            appearance={{
              variables: {
                colorPrimary: '#0f6b5c',
                colorText: '#1b2430',
                colorBackground: '#ffffff',
                borderRadius: '8px',
                fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
              },
              elements: {
                card: { boxShadow: 'none', border: '1px solid #dadfda' },
              },
            }}
          />
        </div>
      </main>
    </div>
  )
}

function RouteMark() {
  return (
    <svg className="login__routemark" viewBox="0 0 220 120" fill="none" aria-hidden="true">
      <path
        d="M18 96 C 60 96, 60 40, 100 40 S 160 20, 202 20"
        stroke="#e0a458"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="18" cy="96" r="5" fill="#e0a458" />
      <circle cx="100" cy="40" r="5" fill="#e0a458" />
      <circle cx="202" cy="20" r="5" fill="#e0a458" />
    </svg>
  )
}
