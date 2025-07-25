import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Allow external connections
    proxy: {
      // Proxy API calls to Kong API Gateway during development
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Don't rewrite the path - Kong expects /api prefix
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  define: {
    // Inject environment variables
    __API_BASE_URL__: JSON.stringify(process.env.VITE_API_BASE_URL || 'http://localhost:8000'),
    __API_KEY__: JSON.stringify(process.env.VITE_API_KEY || 'frontend-app-key-12345')
  }
})
