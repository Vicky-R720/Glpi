import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        //tsiory
        // target: 'http://glpi.local',

        //vicky
        //target: 'http://localhost/glpi/public',
        target: 'http://glpi.local',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/apirest.php'),
      },
    },
  },
})
