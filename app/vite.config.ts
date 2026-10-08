import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages 프로젝트 사이트 경로: https://hgko1207.github.io/daily-news/
const BASE = '/daily-news/';

export default defineConfig({
  base: BASE,
  define: {
    __APP_VERSION__: JSON.stringify(`${process.env.npm_package_version ?? '0.0.0'}+${(process.env.GITHUB_SHA ?? 'local').slice(0, 7)}`),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg'],
      manifest: {
        name: '데일리 브리핑',
        short_name: '브리핑',
        description: 'Claude가 매일 아침 정리하는 개인 브리핑',
        lang: 'ko',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        // Montage primary.normal / background.normal
        theme_color: '#0066FF',
        background_color: '#FFFFFF',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // data/는 precache하지 않는다. 매일 바뀌는 데이터가 앱 업데이트로 오인되지 않게(Eng Review).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['data/**'],
        navigateFallback: `${BASE}index.html`,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\/data\/(index|aggregates)\.json$/.test(url.pathname),
            handler: 'NetworkFirst',
            options: { cacheName: 'briefing-index', networkTimeoutSeconds: 3 },
          },
          {
            urlPattern: ({ url }) => /\/data\/(days\/.+|search-.+)\.json$/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'briefing-days', expiration: { maxEntries: 400 } },
          },
          // Google Fonts: CSS는 가끔 바뀌니 SWR, 글꼴 파일은 주소가 버전이라 CacheFirst
          {
            urlPattern: ({ url }) => url.hostname === 'fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'font-css' },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.gstatic.com',
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 200,maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  test: {
    include: ['scripts/**/*.test.ts', 'src/**/*.test.ts'],
  },
});
