import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server accesible en la red local (para probar desde el celular)
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
})
