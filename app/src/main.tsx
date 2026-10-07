import '@wanteddev/wds/global.css';
import { ThemeProvider } from '@wanteddev/wds';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { captureInstallPrompt } from './install.ts';

captureInstallPrompt();

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    {/* 다크 모드 허용, 기본값은 시스템(D14) */}
    <ThemeProvider enableDarkMode>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
