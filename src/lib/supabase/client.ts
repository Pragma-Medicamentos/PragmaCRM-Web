import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Unico cliente de Supabase del dashboard. Solo se usa para Auth (sesion,
 * login, logout) — el resto del dominio se consulta via PragmaCRM-Api, que
 * se conecta a la base con un rol que ignora RLS. Ver CLAUDE.md seccion
 * "Decision vigente de autenticacion".
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
