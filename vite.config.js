import { defineConfig } from 'vite'

export default defineConfig({
  build: {
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