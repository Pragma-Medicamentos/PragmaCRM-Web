# CLAUDE.md — PragmaCRM-Web (contexto de este repo)

Contexto específico del dashboard web. El contexto de proyecto completo (DER, RF/RNF, decisiones de negocio) vive en `CLAUDE.md` del repo `PragmaCRM-Api` — cárgalo también si la tarea lo requiere, en particular su sección 5.9 (Autenticación y autorización), que es la fuente de verdad del contrato.

**Última actualización:** 12 de septiembre de 2026 — migrado de Clerk a Supabase Auth (decisión confirmada el 11 de septiembre de 2026 en `PragmaCRM-Api`). Ya no queda `@clerk/clerk-react` en este repo.

---

## Decisión vigente de autenticación

**Supabase Auth** es el proveedor de identidad. El login del dashboard es sin contraseña propia por correo: `POST /api/v1/auth/otp` dispara un código de 6 dígitos, `supabase.auth.verifyOtp` lo verifica contra Supabase, y si la cuenta todavía no tiene contraseña (`passwordSetAt` null en `/api/v1/me`) el mismo formulario la pide antes de dejar entrar — ver `LoginPage.tsx` y `authApi.ts`. (Nota: una versión anterior de este documento describía `supabase.auth.signInWithPassword`; quedó reemplazado por este flujo de OTP, compartido con el alta de vendedores.) Solo `Administrador` usa este dashboard (RF-01); `Vendedor` usa exclusivamente la app Android.

Dos caminos hacia los datos, igual que en `PragmaCRM-Api`:

| Camino | Quién decide | Cuándo lo usa este repo |
|---|---|---|
| Cliente → Supabase (`supabase-js`) | Las políticas RLS | Solo Auth: login, logout, sesión |
| Cliente → `PragmaCRM-Api` | `requireAuth` / `requireRole` | Todo lo demás: `/me`, alta de vendedores |

Este repo **no** consulta tablas del dominio directamente contra Supabase (nada de `supabase.from(...)`); eso sigue siendo trabajo de la API, que se conecta con un rol que ignora RLS. `supabase-js` aquí es solo el cliente de Auth.

## Lo que sí tiene que hacer este repo

1. **Variables de entorno** (`.env.example`):

   ```
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=...
   VITE_API_URL=http://localhost:3000
   VITE_API_KEY=...
   ```

   La anon key es pública por diseño (viaja en el bundle web); igual que con Clerk, la que **nunca** va aquí es la `service_role` key — esa es solo de servidor, vive en `PragmaCRM-Api`. Valores locales: `npx supabase status` en `PragmaCRM-Api`.

   `VITE_API_KEY` debe ser igual al `API_KEY` del `.env` de `PragmaCRM-Api` (2026-09: gate de transporte agregado en `middleware/apiKey.ts`, exigido en **toda** ruta bajo `/api/v1` salvo `/api/health`, por delante de `requireAuth`). No es sensible de la misma forma que la `service_role` key — no otorga identidad ni permisos por sí sola — pero sin ella cualquier llamada a la API, incluido pedir el OTP de login, responde 401 "Invalid or missing API key". Se manda como header `x-api-key` en `lib/api/apiClient.ts` (`apiFetch` y `apiCall`).

2. **Login con `supabase-js`** (`@supabase/supabase-js`). El cliente único vive en `src/lib/supabase/client.ts`. `LoginPage.tsx` implementa el formulario de email + contraseña a mano — no hay componente de UI prearmado como el `<SignIn/>` de Clerk, así que los estados de error (credenciales inválidas, etc.) se manejan aquí.

3. **Enviar el access token en cada petición a la API**, tomado de la sesión vigente de Supabase — nunca cacheado más allá de lo que el propio SDK cachea. `useCurrentAppUser.ts` se suscribe a `supabase.auth.onAuthStateChange`, que entrega la sesión inicial y cada cambio posterior (login, logout, refresh de token). Implementado en `lib/api/apiClient.ts` / `features/auth/useCurrentAppUser.ts`.

   ```
   Authorization: Bearer <access_token>
   ```

4. **Resolver el estado inicial con `GET /api/v1/me`.** Es el único endpoint necesario para el login — `useCurrentAppUser.ts` lo llama con el token de la sesión de Supabase.

   Respuesta 200:

   ```json
   {
     "success": true,
     "message": "Sesión válida",
     "data": {
       "id": "8bbfcd4c-...",
       "authUserId": "3f9a...-...-...-...-...",
       "role": "Administrador",
       "name": "Andrés Galán",
       "email": "andres@...",
       "passwordSetAt": "2026-09-11T12:00:00.000Z"
     }
   }
   ```

   `role` es exactamente `"Administrador"` o `"Vendedor"`. No está en el token: sale de la base de datos vía este endpoint. No lo leas de los claims de Supabase. `authUserId` es `auth.users.id` (el claim `sub`), no un id de Clerk. `passwordSetAt` es `null` mientras la cuenta no tiene contraseña fijada (relevante para el flujo de alta de vendedores desde la app; este dashboard no lo usa todavía).

5. **Tratar 401 y 403 como cosas distintas:**

   | Código | Significa | Acción |
   |---|---|---|
   | `401` | No hay sesión válida, o el JWT expiró/es inválido | Redirigir a `/login` |
   | `403` | Sesión válida, pero el usuario no puede operar (no está dado de alta en el CRM, está deshabilitado, o su rol no tiene permiso) | **No** redirigir al login — es un bucle infinito, porque volver a iniciar sesión no lo arregla. Mostrar el `message` de la respuesta |
   | `503` | El JWKS de Supabase no responde (problema de red, no del token) | Tratar como error transitorio, no como sesión inválida |

   Todas las respuestas de la API usan el mismo envelope: `{ success, message, data?, errors? }`.

## Contrato de `/api/v1/sellers` (RF-01 / HU-01)

**Implementado en este repo:** pantalla de listado, alta, edición y habilitar/deshabilitar de vendedores (`src/features/vendors/`), ruta `/vendedores` (protegida por `AdminRoute`). También reenvío de OTP desde el listado.

Contrato real contra `PragmaCRM-Api` (`src/presentation/sellers/`, `src/services/seller.service.ts`, `src/use-cases/set-seller-status.use-case.ts`) — ya implementado del lado del backend:

- **La cuenta nace sin contraseña.** El admin solo da de alta `name` + `email`; la API crea el usuario en Supabase Auth (`email_confirm: true`, sin password) y envía un código OTP de 6 dígitos al correo del vendedor. El vendedor lo verifica y fija su contraseña desde la app (`supabase.auth.verifyOtp` + `updateUser({ password })`) — este dashboard no participa en ese paso ni muestra ninguna contraseña.
- El admin **no** elige ni genera una contraseña inicial. Esa decisión (registrada en una versión anterior de este documento) quedó reemplazada por el flujo de OTP al pasar la autenticación a Supabase.

`GET /api/v1/sellers` — requiere `requireAuth` + `requireRole(ADMIN)`. Devuelve todos los `app_user` con `role = 'Vendedor'`, sin transformar las llaves (snake_case tal cual la base):

```json
{
  "success": true,
  "message": "Vendedores obtenidos correctamente",
  "data": [
    {
      "id": "uuid",
      "name": "...",
      "email": "...",
      "active": true,
      "auth_user_id": "uuid",
      "created_at": "2026-09-01T00:00:00.000Z",
      "updated_at": "2026-09-01T00:00:00.000Z"
    }
  ]
}
```

`POST /api/v1/sellers` — mismo guard. Body: `{ "name": "...", "email": "..." }`. Responde 201 con el vendedor creado (mismo shape que un elemento del listado). Un correo duplicado responde con un error de envelope legible (409), no un 500.

`PATCH /api/v1/sellers/:id` — body `{ name?, email? }`, al menos uno de los dos (`updateSellerSchema` lo exige con `.refine`). No acepta `active` ni contraseña. Responde 200 con el vendedor actualizado; 404 si el id no existe o ya está soft-deleted, 409 si el correo ya está en uso por otro vendedor.

`PATCH /api/v1/sellers/:id/active` — body `{ "active": boolean }`. Además de actualizar `app_user.active`, banea (o desbanea) al usuario en Supabase Auth para matar la sesión viva (`set-seller-status.use-case.ts`) — es la ruta que implementa CA2. El dashboard pide confirmación antes de deshabilitar (no antes de habilitar), porque deshabilitar corta el acceso del vendedor a la app móvil de inmediato.

`POST /api/v1/sellers/:id/resend-otp` — reenvía el código si el vendedor no alcanzó a usarlo en los 10 minutos de vigencia. Disponible como acción por fila en el listado.

Validación que corre en el frontend (la API la repite, nunca hay que confiar solo en el cliente): `name` no vacío, `email` con formato válido.

## Contrato de `/api/v1/routes` (RF-04)

**Implementado en este repo:** planificador semanal de rutas por vendedor (`src/features/routes/`), ruta `/rutas` (protegida por `AdminRoute`), entrada "Planificador de rutas" en el sidebar (grupo Operación). Wireframe de referencia: `1g` (`docs/wireframes/Wireframes Pragma CRM y App.html`), con dos recortes de alcance frente al sketch — ver el comentario de cabecera en `routes.types.ts` y en `CreateRouteDialog.tsx`:

- Sin "Copiar semana anterior" ni "Publicar semana": `route_user` es una asignación **recurrente e indefinida** por día de la semana (CLAUDE.md de `PragmaCRM-Api`, sección 5.1), no un registro por semana. La grilla es una vista sobre esa asignación permanente.
- "Nueva ruta" solo crea `name` / `municipality` / `zone`. La composición de clientes de la ruta (`route_customer`) no tiene endpoint todavía.

Contrato real contra `PragmaCRM-Api` (`src/presentation/routes/`, `src/services/route.service.ts`, `src/use-cases/{assign,reassign}-route.use-case.ts`):

- `GET /api/v1/routes?active=true|false` — lista rutas no borradas, sin paginar (el volumen es "decenas" de filas).
- `POST /api/v1/routes` — body `{ name, municipality?, zone? }`. 201 con la ruta creada, `active: true` por defecto.
- `PATCH /api/v1/routes/:id` — cualquier subconjunto de `{ name, municipality, zone, active }`, al menos uno.
- `GET /api/v1/routes/:id/assignments` — asignaciones vigentes (`deleted_at IS NULL`) de esa ruta: `{ id, route_id, user_id, user_name, day, status, created_at, updated_at }`. `day` es `1..7` (1 = Lunes), el backend nunca manda el nombre del día — el mapeo vive en `routes.types.ts` (`DAY_LABELS`/`DAY_LABELS_SHORT`).
- `POST /api/v1/routes/:id/assignments` — body `{ user_id, day }`. 201 con la asignación creada; **409** si ese día ya tiene un vendedor activo (hay que usar `reassign`, no reintentar el mismo POST).
- `POST /api/v1/routes/:id/reassign` — mismo body. Cierra (soft-delete) la asignación activa de ese día y crea una nueva para el vendedor indicado, en una sola operación atómica del lado del backend. **400** si el día no tiene asignación activa; **409** si el vendedor ya es el mismo.
- `DELETE /api/v1/routes/:id/assignments/:day` — vacía el día (soft-delete, sin reemplazo). Devuelve el envelope sin `data` (solo `message`), como `POST /api/v1/auth/otp` — por eso `unassignRouteDay` en `routesApi.ts` usa `apiCall`, no `apiFetch`. **404** si no había nada activo ese día.

No hay un endpoint "asignaciones por vendedor": la vista semanal por vendedor se arma en el cliente (`useRoutePlanner.ts`) pidiendo todas las rutas activas y las asignaciones de cada una en paralelo.

## Cosas a tener presentes durante la integración

**a) CORS.** Si aparece un error de CORS en el navegador al llamar a `localhost:3000` desde `localhost:5173`, es configuración pendiente del lado de `PragmaCRM-Api`, no de este repo.

**b) Un login exitoso puede devolver 403 de todas formas.** Si el usuario de prueba en Supabase Auth no está enlazado a una fila de `app_user` (`auth_user_id`), la API responde 403 "El usuario no está registrado en el CRM" con un token perfectamente válido. Pedirle a backend que enlace el usuario de prueba, no depurar el frontend primero.

**c) La cuenta de prueba necesita contraseña fijada.** A diferencia de Clerk, Supabase Auth no tiene una pantalla de "olvidé mi contraseña" propia integrada en este dashboard: si un usuario admin de prueba no tiene contraseña (`passwordSetAt` null en `/me`, o directamente no puede iniciar sesión), hay que fijarla desde el dashboard de Supabase o con `supabase.auth.admin.updateUserById` — no hay flujo de recuperación implementado aquí todavía.
