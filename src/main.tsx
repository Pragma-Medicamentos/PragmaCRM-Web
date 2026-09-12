import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App'
import './index.css'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const apiUrl = import.meta.env.VITE_API_URL

if (!publishableKey) {
  throw new Error(
    'Falta VITE_CLERK_PUBLISHABLE_KEY. Copia .env.example a .env y completa las claves.'
  )
}

if (!apiUrl) {
  throw new Error('Falta VITE_API_URL. Copia .env.example a .env y completa las claves.')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/login">
      <App />
    </ClerkProvider>
  </React.StrictMode>
)
