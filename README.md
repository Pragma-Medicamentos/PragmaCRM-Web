# Pragma CRM — Web (base de login)

Base del dashboard administrativo. **Alcance de este entregable: únicamente el login web y el guard de rutas por rol.** No incluye ningún módulo de gestión (vendedores, clientes, rutas, KPIs).

Contexto de autenticación completo (decisión vigente, contrato con la API, gotchas de integración) en [CLAUDE.md](./CLAUDE.md).

## Stack

- React + TypeScript + Vite
- Clerk (`@clerk/clerk-react`) — autenticación
- React Router
- Toda autorización se resuelve contra `PragmaCRM-Api` (`GET /api/v1/me`). Este repo no habla con Supabase.

## Instalación

```bash
npm install
cp .env.example .env
# completar VITE_CLERK_PUBLISHABLE_KEY y, si la API no corre en localhost:3000, VITE_API_URL
npm run dev
```

## Prerrequisitos (bloquean el login si faltan)

1. `PragmaCRM-Api` corriendo y con CORS habilitado para el origen de este dev server. Ver [CLAUDE.md](./CLAUDE.md) — es el bloqueo más común al integrar.
2. El usuario de prueba de Clerk enlazado a mano con una fila de `app_user` (no hay webhook de sincronización todavía). Sin esto, la API responde 403 aunque el login sea correcto.
3. *Organizations* desactivado en la instancia de Clerk usada.

## Estructura

```
src/
├── main.tsx                          # ClerkProvider
├── App.tsx
├── lib/api/apiClient.ts              # fetch a la API con Bearer token, distingue 401/403
├── features/auth/
│   ├── auth.types.ts
│   ├── useCurrentAppUser.ts          # resuelve role/name vía GET /api/v1/me
│   ├── AdminRoute.tsx                # guard de rutas
│   ├── SessionGate.tsx               # loading state
│   └── LoginPage.tsx
├── pages/DashboardPlaceholder.tsx    # placeholder protegido, con logout
└── routes/router.tsx
```

## Comportamiento del guard (`AdminRoute`)

| Estado | Resultado |
|---|---|
| Sesión cargando | `SessionGate` (evita parpadeo) |
| Sin sesión, o la API responde 401 | Redirige a `/login` sin mensaje |
| La API responde 403 | Redirige a `/login` mostrando el `message` que mandó la API (cuenta no registrada, deshabilitada, etc.) |
| `role !== 'Administrador'` | Redirige a `/login` con "sin permisos de Administrador" (gate propio de este dashboard; `/api/v1/me` no lo rechaza) |
| `role === 'Administrador'` | Renderiza la ruta protegida |

Errores de credenciales (contraseña incorrecta, etc.) los maneja el propio componente `<SignIn/>` de Clerk — no se reimplementan.

## Pendiente, fuera de alcance de este entregable

- Módulos de gestión reales (RF-01 a RF-12).
- CORS en `PragmaCRM-Api` (bloquea todo login en el navegador hasta que se implemente).
- Paleta e iconografía corporativa real de Pragma (RNF-09): los colores usados aquí son un placeholder profesional, no la identidad de marca del cliente.
