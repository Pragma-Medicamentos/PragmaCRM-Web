/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_API_URL: string
  readonly VITE_API_KEY: string
  /** Opcional. Debe coincidir con UPLOAD_MAX_FILE_SIZE_MB de PragmaCRM-Api. */
  readonly VITE_UPLOAD_MAX_FILE_SIZE_MB?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
