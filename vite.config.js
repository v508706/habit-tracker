import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase-core': ['firebase/app', 'firebase/auth'],
          'firebase-db':   ['firebase/firestore'],
          'firebase-msg':  ['firebase/messaging'],
          'react-vendor':  ['react', 'react-dom'],
        },
      },
    },
  },
})
