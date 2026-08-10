import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mkcert from 'vite-plugin-mkcert'

// https://vite.dev/config/
export default defineConfig({
  // mkcert gera uma CA local e instala no truststore do Windows (1x, pode
  // pedir permissão de admin) — certificado confiável de verdade, sem aviso
  // de "não seguro" no navegador, diferente do certificado autoassinado puro.
  plugins: [react(), tailwindcss(), mkcert()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
