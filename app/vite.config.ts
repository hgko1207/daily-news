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
        // Montage background.normal(라이트). manifest는 다크 값을 따로 못 둔다. 실행 후 상태 표시줄 색은 App.tsx가 테마에 맞춘다.
        theme_color: '#FFFFFF',
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
            urlPattern: ({ url }) => /\/data\/days\/.+\.json$/.test(url.pathname),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'briefing-days', expiration: { maxEntries: 400 } },
          },
          // 검색 파일은 이름에 내용 해시가 있어 이름이 같으면 내용도 같다. 한 번 받으면 다시 묻지 않는다.
          // 이번 달 파일은 매일 새 이름이 생기므로 오래된 것은 개수 제한으로 지운다(월 수 + 여유).
          {
            urlPattern: ({ url }) => /\/data\/search-[\d-]+\.[0-9a-f]{8}\.json$/.test(url.pathname),
            handler: 'CacheFirst',
            options: { cacheName: 'briefing-search', expiration: { maxEntries: 40 } },
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
