import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { TooltipProvider } from './components/ui/tooltip'
import { applyDesignTokens } from './lib/design-tokens'
import './styles/shadcn.css'

// Antes del primer render: los colores del tema vienen de lib/design-tokens.ts.
applyDesignTokens()

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const apiUrl = import.meta.env.VITE_API_URL

if (!supabaseUrl) {
  throw new Error('Falta VITE_SUPABASE_URL. Copia .env.example a .env y completa las claves.')
}

if (!supabaseAnonKey) {
  throw new Error('Falta VITE_SUPABASE_ANON_KEY. Copia .env.example a .env y completa las claves.')
}

if (!apiUrl) {
  throw new Error('Falta VITE_API_URL. Copia .env.example a .env y completa las claves.')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TooltipProvider>
      <App />
    </TooltipProvider>
  </React.StrictMode>
)
