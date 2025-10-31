import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// The configuration has been simplified to use Vite's standard environment variable handling.
// Client-side code now uses `import.meta.env.VITE_VARIABLE_NAME` to access variables
// defined in a .env file (e.g., VITE_FIREBASE_API_KEY).
// Vite automatically exposes variables with the `VITE_` prefix.
export default defineConfig({
  plugins: [react()],
});
