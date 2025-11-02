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
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
});
