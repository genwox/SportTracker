import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      filename: 'service-worker.js',
      strategies: 'generateSW',
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,ttf}'] },
      manifest: {
        name: 'SportTracker',
        short_name: 'SportTracker',
        id: './',
        start_url: './',
        display: 'standalone',
        background_color: '#DDF6F4',
        theme_color: '#082D45',
        prefer_related_applications: false,
        icons: [
          { src: 'icon-192.png', type: 'image/png', sizes: '192x192' },
          { src: 'icon-512.png', type: 'image/png', sizes: '512x512' },
        ],
      },
    }),
  ],
})
