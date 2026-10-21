import { pfxReleasePlugin } from "./scripts/pfx-release.mjs";
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), pfxReleasePlugin()],
  base: process.env.FRONTLAB_BASE_PATH || '/',
  build: { target: 'es2022', cssCodeSplit: true },
  server: { strictPort: true, port: 5173 }
});