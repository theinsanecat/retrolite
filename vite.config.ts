import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/*
 * Strict Content Security Policy, added to the built page only (Vite's dev
 * server needs inline scripts for hot reload). Only this site's own scripts,
 * styles and images may load, and the page can't talk to any other server.
 * Even if someone pasted a malicious link or script into a card, the browser
 * would refuse to load it or send data anywhere.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ')

const csp = (): Plugin => ({
  name: 'retrolite-csp',
  apply: 'build',
  transformIndexHtml: html =>
    html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
})

export default defineConfig({
  base: './', // works on GitHub Pages under /<repo>/
  plugins: [
    react(),
    csp(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script', // an external registerSW.js file, so the CSP needs no inline script
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Retrolite',
        short_name: 'Retrolite',
        description: 'Sprint retros in the browser. Offline, shareable, no backend.',
        theme_color: '#7c5cff',
        background_color: '#f7f5fb',
        display: 'standalone',
        start_url: './',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg}'] },
    }),
  ],
})
