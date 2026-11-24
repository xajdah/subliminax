import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 0.0.0.0 so Try Live desktop / proxies can reach the app; still use http://127.0.0.1:5173 locally
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
})
