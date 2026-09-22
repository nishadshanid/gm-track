import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base: './'` keeps asset paths relative so the build works on GitHub Pages
// regardless of the repository name / subpath. Routing uses HashRouter, so no
// server-side rewrite is needed.
export default defineConfig({
  base: './',
  plugins: [react()],
})
