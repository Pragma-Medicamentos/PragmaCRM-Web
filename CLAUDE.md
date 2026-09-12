# CLAUDE.md — PragmaCRM-Web (contexto de este repo)

Contexto específico del dashboard web. El contexto de proyecto completo (DER, RF/RNF, decisiones de negocio) vive en `CLAUDE.md` del repo `PragmaCRM-Api` — cárgalo también si la tarea lo requiere.

**Última actualización:** 10 de septiembre de 2026 — código migrado a la arquitectura vigente (ver abajo). Ya no queda `SupabaseProvider` ni `@supabase/supabase-js` en este repo; `useCurrentAppUser` llama a `GET /api/v1/me` en la API.

---

## Decisión vigente de autenticación

Toda validación de identidad y permisos ocurre en `PragmaCRM-Api`. **El frontend no habla con Supabase.** De Supabase solo se usa la base de datos, y únicamente la API se conecta a ella. Confirmado con un login de extremo a extremo contra la API real, con un token real de Clerk, sin nada de lo que sigue.

Tres cosas que **no** hacen falta y que no bloquean el login — si aparecen en documentación previa (incluido el README de este repo), están obsoletas:

- Activar *Third-Party Auth* de Clerk en Supabase. Solo aplicaría si el cliente consultara Supabase directamente, y no es el caso.
- Cualquier policy RLS. La API se conecta con un rol que ignora RLS; una policy no afecta a ningún endpoint.
- El webhook `user.created` / `user.updated` de Clerk. Es una tarea aparte, no bloqueante. Este sprint los usuarios se enlazan a mano en `app_user`.

Esto reemplaza también la sección 5.9 de `PragmaCRM-Api/CLAUDE.md` en lo que toca a estos tres puntos; esa sección tiene una corrección pendiente de mergear.

## Lo que sí tiene que hacer este repo

1. **Variables de entorno** (`.env.example`):

   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   VITE_API_URL=http://localhost:3000
   ```

   Nunca la secret key de Clerk: con Vite, toda variable `VITE_*` queda incrustada en el bundle y es pública; la secret key vive solo en la API. No se usan `VITE_SUPABASE_URL` ni anon key — este repo no habla con Supabase.

2. **Login con el SDK de Clerk React** (`@clerk/clerk-react`). Clerk maneja pantallas, contraseñas, recuperación y persistencia de sesión — ver `LoginPage.tsx`.

3. **Enviar el token en cada petición a la API**, pedido con `getToken()` por petición — no una vez al inicio. Los tokens duran ~60 segundos y el SDK los renueva solo. Implementado en `lib/api/apiClient.ts`.

   ```
   Authorization: Bearer <token>
   ```

4. **Resolver el estado inicial con `GET /api/v1/me`.** Es el único endpoint necesario para el login — `useCurrentAppUser.ts` lo llama.

   Respuesta 200:

   ```json
   {
     "success": true,
     "message": "Sesión válida",
     "data": {
       "id": "8bbfcd4c-...",
       "clerkUserId": "user_3J7T...",
       "role": "Administrador",
       "name": "Andrés Galán",
       "email": "andres@..."
     }
   }
   ```

   `role` es exactamente `"Administrador"` o `"Vendedor"`. No está en el token: sale de la base de datos vía este endpoint. No lo leas de los claims de Clerk.

5. **Tratar 401 y 403 como cosas distintas:**

   | Código | Significa | Acción |
   |---|---|---|
   | `401` | No hay sesión válida | Redirigir a `/login` |
   | `403` | Sesión válida, pero el usuario no puede operar (no está dado de alta en el CRM, está deshabilitado, o su rol no tiene permiso) | **No** redirigir al login — es un bucle infinito, porque volver a iniciar sesión no lo arregla. Mostrar el `message` de la respuesta |

   Todas las respuestas de la API usan el mismo envelope: `{ success, message, data?, errors? }`.

## Tres cosas que van a morder durante la integración

**a) CORS todavía no está implementado en la API.** El navegador va a bloquear las llamadas desde `localhost:5173` hacia `localhost:3000` con un error de CORS. No es el token ni el código de este repo — falta configurarlo del lado de `PragmaCRM-Api`. Coordinar con backend antes de integrar.

**b) Un login exitoso puede devolver 403, y es lo esperado.** Mientras no exista el webhook, cada usuario de Clerk debe estar enlazado a mano con una fila de `app_user`. Si el usuario de prueba no está enlazado, Clerk da un token perfectamente válido y la API responde 403 "El usuario no está registrado en el CRM". Pedirle a backend que enlace el usuario de prueba, no depurar el frontend primero.

**c) *Organizations* debe estar desactivado en Clerk.** Si la selección obligatoria de organización está activa, todos los inicios de sesión generan sesiones `pending`: el login parece exitoso, el token parece normal, y la API responde 401 a todo. Ya está desactivado en la instancia de desarrollo (10 de septiembre de 2026); si aparecen 401 sistemáticos con un login que en apariencia funcionó, revisar esto primero antes que el código.
