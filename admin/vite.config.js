import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Standalone admin app. `base: './'` makes all asset URLs relative to
// index.html, so the built app works wherever it is deployed — the site
// root, a /admin/ subpath, a subdomain, or opened from disk — without the
// CSS/JS 404-ing. (Safe here because the admin app has no client-side
// routing.) Proxies /api to the Express server (:4000) during development.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
})
