import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served at business.mlino.site/accounting/. The accounting engine is imported from ../implementation/accounting
// (plain TypeScript, no Node APIs), so the browser runs exactly the code the tests cover.
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false },
});
