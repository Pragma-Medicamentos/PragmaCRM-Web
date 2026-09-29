/// <reference types="google.maps" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_API_URL: string
  readonly VITE_API_KEY: string
  /** Opcional. Debe coincidir con UPLOAD_MAX_FILE_SIZE_MB de PragmaCRM-Api. */
  readonly VITE_UPLOAD_MAX_FILE_SIZE_MB?: string
  /** Maps JS + Places. Opcional: sin ella el picker muestra aviso controlado. */
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
