import { createClient } from '@supabase/supabase-js'
import { clearLegacyAuthStorage } from '../auth/legacyAuthStorage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

clearLegacyAuthStorage()

/**
 * Cliente de Supabase. El dashboard ya no inicia sesión contra Supabase
 * desde el navegador: la API fija cookies HttpOnly (PCRM-109). Estas
 * opciones evitan que el SDK vuelva a guardar access/refresh en
 * localStorage si algún llamado residual lo usa.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
})
