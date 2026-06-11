import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VERCEL ? '/' : './',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('react') || id.includes('scheduler')) {
            return 'vendor-react'
          }

          if (id.includes('@supabase')) {
            return 'vendor-supabase'
          }

          if (id.includes('lucide-react') || id.includes('lucide')) {
            return 'vendor-icons'
          }

          if (id.includes('pdfjs-dist')) {
            return 'vendor-pdfjs'
          }

          if (id.includes('html2canvas')) {
            return 'vendor-html2canvas'
          }

          if (id.includes('jspdf') || id.includes('pako') || id.includes('fflate')) {
            return 'vendor-jspdf'
          }

          if (id.includes('canvg') || id.includes('svg2pdf')) {
            return 'vendor-pdf-svg'
          }

          if (id.includes('dompurify')) {
            return 'vendor-sanitize'
          }

          if (
            id.includes('recharts') ||
            id.includes('victory-vendor') ||
            id.includes('d3-') ||
            id.includes('@reduxjs') ||
            id.includes('react-redux') ||
            id.includes('redux') ||
            id.includes('immer') ||
            id.includes('reselect') ||
            id.includes('decimal.js-light')
          ) {
            return 'vendor-charts'
          }

          return undefined
        },
      },
    },
  },
})
