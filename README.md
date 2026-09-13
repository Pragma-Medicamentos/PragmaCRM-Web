# Pragma CRM — Web (base de login)

Base del dashboard administrativo. **Alcance de este entregable: únicamente el login web y el guard de rutas por rol.** Además ya incluye listado y alta de vendedores (RF-01 / HU-01); el resto de módulos de gestión (clientes, rutas, KPIs) no está implementado.

Contexto de autenticación completo (decisión vigente, contrato con la API, gotchas de integración) en [CLAUDE.md](./CLAUDE.md).

## Stack

- React + TypeScript + Vite
- `@supabase/supabase-js` — autenticación (Supabase Auth)
- React Router
- El resto de la autorización se resuelve contra `PragmaCRM-Api` (`GET /api/v1/me`, `/api/v1/sellers`). Este repo solo usa Supabase para Auth — no consulta tablas del dominio directamente.

## Instalación

```bash
npm install
cp .env.example .env
# completar VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (ver `npx supabase status` en PragmaCRM-Api)
# y, si la API no corre en localhost:3000, VITE_API_URL
npm run dev
```

## Prerrequisitos (bloquean el login si faltan)

1. `PragmaCRM-Api` corriendo y con CORS habilitado para el origen de este dev server. Ver [CLAUDE.md](./CLAUDE.md) — es el bloqueo más común al integrar.
2. El usuario de prueba de Supabase Auth enlazado a `app_user.auth_user_id`. Sin esto, la API responde 403 aunque el login sea correcto.
3. El usuario de prueba con contraseña fijada en Supabase Auth (fijarla desde el dashboard de Supabase si hace falta).

## Estructura

```
src/
├── main.tsx                          # valida env vars, monta App
├── App.tsx
├── lib/
│   ├── supabase/client.ts            # cliente único de supabase-js (solo Auth)
│   └── api/apiClient.ts              # fetch a la API con Bearer token, distingue 401/403
├── features/auth/
│   ├── auth.types.ts
│   ├── useCurrentAppUser.ts          # resuelve role/name vía GET /api/v1/me
│   ├── AdminRoute.tsx                # guard de rutas
│   ├── SessionGate.tsx               # loading state
│   └── LoginPage.tsx                 # form de email + contraseña (signInWithPassword)
├── features/vendors/                 # RF-01 / HU-01: listado y alta de vendedores
├── components/AppShell.tsx           # topbar + nav + logout
├── pages/DashboardPlaceholder.tsx
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

Errores de credenciales (contraseña incorrecta, etc.) se manejan a mano en `LoginPage.tsx` — no hay un componente de Auth UI prearmado.

## Pendiente, fuera de alcance de este entregable

- Módulos de gestión de clientes, rutas y KPIs (RF-02 a RF-12).
- Editar y deshabilitar vendedores (CA2 de HU-01).
- CORS en `PragmaCRM-Api` (bloquea todo login en el navegador hasta que se implemente).
- Recuperación de contraseña desde el dashboard (hoy se gestiona desde Supabase directamente).
- Paleta e iconografía corporativa real de Pragma (RNF-09): los colores usados aquí son un placeholder profesional, no la identidad de marca del cliente.
