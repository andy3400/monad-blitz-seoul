import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Enable polyfills for specific globals and modules
      globals: {
        process: true,
        global: true,
        Buffer: true,
      },
      // Enable polyfills for specific Node.js modules
      protocolImports: true,
    })
  ],
  define: {
    global: 'globalThis',
  }
})
