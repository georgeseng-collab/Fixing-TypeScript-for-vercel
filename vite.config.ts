import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Remove strictPort: true if it's still there, 
    // let StackBlitz pick the port it wants.
  }
})