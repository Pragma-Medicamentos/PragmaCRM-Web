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
  build: {
    rollupOptions: {
      output: {
        // React y supabase-js cambian mucho menos seguido que el codigo de la
        // app: en chunks aparte el navegador los reusa entre deploys en lugar
        // de rebajarlos con cada cambio de pantalla.
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          // Gráficos y calendario del panel de métricas (RF-09).
          charts: ['recharts', 'react-day-picker', 'date-fns'],
        },
      },
    },
  },
})
