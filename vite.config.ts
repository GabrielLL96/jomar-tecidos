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
  // Porta fixa: Auth (Supabase) usa a origem como allowlist de redirect
  // (reset de senha etc.) — porta variável quebra isso em silêncio quando o
  // Vite incrementa por já estar ocupada.
  server: {
    port: 5174,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
