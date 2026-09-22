# Pragma CRM — Web (base de login)

Base del dashboard administrativo. **Alcance de este entregable: únicamente el login web y el guard de rutas por rol.** Además ya incluye listado y alta de vendedores (RF-01 / HU-01); el resto de módulos de gestión (clientes, rutas, KPIs) no está implementado.

Contexto de autenticación completo (decisión vigente, contrato con la API, gotchas de integración) en [CLAUDE.md](./CLAUDE.md).

## Stack

- React + TypeScript + Vite
- `@supabase/supabase-js` — autenticación (Supabase Auth)
- React Router
- El resto de la autorización se resuelve contra `PragmaCRM-Api` (`GET /api/v1/me`, `/api/v1/sellers`). Este repo solo usa Supabase para Auth — no consulta tablas del dominio directamente.

## Componentes de UI (shadcn/ui)

El proyecto tiene instalado **Tailwind CSS v4 + shadcn/ui** (preset `radix-nova`, primitivas de Radix). Ninguna pantalla existente está migrada: la UI actual sigue con el CSS de `src/index.css`.

```bash
npx shadcn@latest add @shadcn/<componente>   # p. ej. @shadcn/checkbox
```

- Los componentes se generan en `src/components/ui/` y se importan con el alias `@/` (`import { Button } from '@/components/ui/button'`).
- Los tokens viven en `src/styles/shadcn.css`, aparte de `index.css` para no mezclar el CSS de las pantallas actuales con el de la librería. `--primary` y `--ring` ya apuntan al verde de la marca y `--radius` a los 6px de `.button`.
- El helper de clases es `cn()` (`src/lib/utils.ts`), reexportado del paquete `cn` de shadcn.

Tres cosas que conviene saber antes de tocar estilos:

1. **No reutilizar las clases BEM existentes** (`.button`, `.modal`, `.table`, `.field`…) en pantallas nuevas. `index.css` está fuera de `@layer`, y eso vence a cualquier utilidad de Tailwind sin importar la especificidad: un `<div className="modal p-4">` ignoraría el `p-4`.
2. **El reset de Tailwind (Preflight) está activo.** Al final de `index.css` hay un bloque que repone los defaults del navegador de los que dependía la UI anterior (viñetas, márgenes de `<p>`, negrita de títulos…). Si se migra una pantalla a shadcn, su regla correspondiente en ese bloque se puede borrar.
3. **React 18:** los componentes del registry actual ya no usan `forwardRef` (asumen React 19), así que un `ref` pasado desde fuera no llega al DOM. Solo importa si se integra una librería de formularios que necesite el `ref` del input; en ese caso hay que envolver el componente en `React.forwardRef` a mano.

El tema oscuro (`.dark` en `src/styles/shadcn.css`) viene del preset pero está inerte: nadie aplica esa clase.

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

## Despliegue (Dokploy + nginx)

El repo trae `Dockerfile` y `nginx/default.conf.template`: build multi-stage donde Node compila y
nginx sirve el estático. En Dokploy se crea una **Application** conectada a este repo con:

| Ajuste | Valor |
|---|---|
| Build Type | `Dockerfile` |
| Dockerfile Path | `Dockerfile` |
| Port | `80` (TLS lo termina Traefik por delante) |

**No usar Nixpacks.** Nixpacks arma su propia imagen a partir del repo: ignora el `Dockerfile` y
`nginx/`, con lo que se pierden el fallback SPA, la CSP y los headers. El deploy sigue siendo desde
git igual que con Nixpacks — lo único que cambia es el Build Type.

Variables a cargar en el panel (las cuatro primeras son obligatorias):

```
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=https://api.<dominio>
VITE_API_KEY=...                     # igual al API_KEY del .env de PragmaCRM-Api
VITE_UPLOAD_MAX_FILE_SIZE_MB=100     # opcional, default 100
```

**Estas variables se hornean en el bundle al compilar**, así que Dokploy tiene que propagarlas como
build args. Si la versión instalada no pasa las env vars al build, hay que repetirlas en la sección
*Build Args* de la aplicación. El `Dockerfile` corta el build con un mensaje explícito si alguna
falta — es a propósito: sin ese chequeo saldría una imagen apuntando a `localhost:3000` que solo se
descubre abriendo el sitio. Cambiar cualquiera de estos valores exige redeploy, no basta reiniciar.

Lo que hace la config de nginx: fallback SPA (`try_files … /index.html`, sin esto un refresh en
`/vendedores` da 404 porque el router es `BrowserRouter`), gzip, cache de un año para `/assets/*`
(los nombres ya vienen con hash) con `no-cache` para `index.html`, y headers de seguridad —
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` y una CSP
afinada a Supabase, la API, Google Fonts y los tiles de OpenStreetMap. Los dos orígenes variables de
la CSP (`connect-src`) salen de `VITE_SUPABASE_URL` y `VITE_API_URL` vía `envsubst` al arrancar el
contenedor. HSTS no se define acá: lo pone Traefik, que es quien ve el HTTPS.

Probar la imagen en local antes de tocar el VPS:

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://<proyecto>.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=... \
  --build-arg VITE_API_URL=https://api.<dominio> \
  --build-arg VITE_API_KEY=... \
  -t pragmacrm-web .
docker run --rm -p 8080:80 pragmacrm-web

curl -I http://localhost:8080/vendedores   # 200 text/html, no 404
curl -I http://localhost:8080/             # headers de seguridad + CSP
```

**Prerrequisito bloqueante:** `PragmaCRM-Api` tiene que permitir CORS para el origen del dashboard
(`https://crm.<dominio>`). Sigue pendiente — ver la lista de abajo y [CLAUDE.md](./CLAUDE.md).

## Estructura

```
src/
├── main.tsx                          # valida env vars, monta App
├── App.tsx
├── styles/shadcn.css                 # Tailwind v4 + tokens de shadcn/ui
├── lib/
│   ├── utils.ts                      # cn() para componer clases
│   ├── supabase/client.ts            # cliente único de supabase-js (solo Auth)
│   └── api/apiClient.ts              # fetch a la API con Bearer token, distingue 401/403
├── components/ui/                    # componentes de shadcn/ui (generados por el CLI)
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
