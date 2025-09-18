import { defineConfig } from 'vite'
import { readFileSync } from 'fs'
import solidPlugin from 'vite-plugin-solid'
import devtools from 'solid-devtools/vite'

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

export default defineConfig({
  plugins: [devtools(), solidPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version)
  },
  server: {
    port: 5173,
    strictPort: true  // Fail if port is in use instead of trying another port
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  esbuild: {
    logOverride: { 'css-syntax-error': 'silent' }
  }
})