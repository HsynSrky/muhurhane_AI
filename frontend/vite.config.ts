import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // TDT logosu depo kökündeki assets/ klasöründe duruyor; kopyalamak yerine
    // Vite'ın oradan okumasına izin veriyoruz.
    fs: { allow: [projectRoot] },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  // `vite preview` sunucu ayarlarını devralmıyor; üretim derlemesinin de
  // gerçek katalogla ölçülebilmesi için vekil burada tekrarlanıyor.
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
  },
})
