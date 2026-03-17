import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // Ensures the app looks at the root for its JS/CSS
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})