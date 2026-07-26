/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative asset paths, so the same build works at a domain root (Vercel,
  // Netlify) or under a subpath (GitHub Pages at /longhand/). State lives in
  // the URL hash rather than the path, so nothing else depends on where it sits.
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
