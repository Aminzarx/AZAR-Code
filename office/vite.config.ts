import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served at office.kssx.ir (its own address and login, Amin #5909); dev proxies /office and /auth to a local azar-auth.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5192,
    proxy: {
      '/office': 'http://localhost:8799',
      '/auth': 'http://localhost:8799',
      // inside the panel (kssx.ir/app/office), as nginx serves it there
      '/app/office/api': { target: 'http://localhost:8799', rewrite: (p) => p.replace(/^\/app\/office\/api/, '') },
    },
  },
});
