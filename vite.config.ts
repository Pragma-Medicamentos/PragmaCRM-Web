import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Sin esto Vite toma todo *.html del proyecto como entrada al pre-escanear
  // dependencias, incluido docs/wireframes/, que no es parte de la app.
  optimizeDeps: {
    entries: ['index.html'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
