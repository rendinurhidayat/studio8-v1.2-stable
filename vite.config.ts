import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: [
      'firebase/compat/auth',
      'firebase/compat/firestore',
      'firebase/compat/storage',
    ],
  },
  server: {
    // Proxy API requests to the Vercel serverless functions endpoint.
    // This is crucial for local development to avoid 404 errors when the frontend
    // calls backend routes like /api/ai. The `vercel dev` command often runs
    // functions on port 3000 by default.
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // Changed to localhost for better compatibility
        changeOrigin: true,
        // Add logging to debug proxy issues
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('--- VITE PROXY ERROR ---');
            console.log('An error occurred while trying to proxy a request.');
            console.log('Request URL:', req.method, req.url);
            console.log('Error:', err);
            console.log('This usually means the backend server (Vercel functions) is not running on the target port, or there is a network issue.');
            console.log('Check the output of `vercel dev` to see which port the API is running on.');
            console.log('------------------------');
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log(`[Vite Proxy] Sending request: ${req.method} ${req.url} -> http://localhost:3000${proxyReq.path}`);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log(`[Vite Proxy] Received response: ${proxyRes.statusCode} ${req.url}`);
          });
        }
      },
    },
  },
});
