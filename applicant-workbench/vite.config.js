import { defineConfig } from 'vite';
export default defineConfig({
  server: {
    port: 3201,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:3200',
        // The API compares Origin with Host for CSRF protection.
        changeOrigin: false,
      },
    },
    watch: process.env.VITE_USE_POLLING === 'true'
      ? { usePolling: true, interval: 300 }
      : undefined,
  },
});
