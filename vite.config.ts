import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true, // Prevents jumping to port 5174
    host: true       // Helps with StackBlitz/Network visibility
  },
  base: '/', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
})