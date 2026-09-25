/**
 * Claves que `@supabase/supabase-js` escribe por defecto en Web Storage
 * (`sb-<ref>-auth-token`, trozos `.0`/`.1`, y el nombre viejo
 * `supabase.auth.token`). La sesión del dashboard vive en cookies HttpOnly
 * de la API; estas claves son residuo de logins anteriores y no deben quedar.
 */
const LEGACY_AUTH_KEY = /^(sb-.+-auth-token.*|supabase\.auth\.token)$/

function purge(storage: Storage): void {
  const keys: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key && LEGACY_AUTH_KEY.test(key)) keys.push(key)
  }
  for (const key of keys) storage.removeItem(key)
}

/** Borra access/refresh tokens que el SDK haya dejado en este origen. */
export function clearLegacyAuthStorage(): void {
  try {
    purge(localStorage)
    purge(sessionStorage)
  } catch {
    /* modo privado o storage bloqueado: no hay tokens que leer tampoco */
  }
}
