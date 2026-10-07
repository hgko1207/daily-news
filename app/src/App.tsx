import { Global, useSnackbar } from '@wanteddev/wds';
import { useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Calendar } from './routes/Calendar.tsx';
import { Collect } from './routes/Collect.tsx';
import { Day } from './routes/Day.tsx';
import { Search } from './routes/Search.tsx';
import { Settings } from './routes/Settings.tsx';
import { Today } from './routes/Today.tsx';
import { StoreProvider } from './store.tsx';

/** 앱 코드가 바뀌었을 때만 새로고침을 묻는다. 데이터 갱신은 store가 따로 처리한다. */
function UpdatePrompt() {
  const snackbar = useSnackbar();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    if (!needRefresh) return;
    snackbar({
      title: '앱이 업데이트됐어요',
      action: { children: '새로고침', onClick: () => void updateServiceWorker(true) },
    });
  }, [needRefresh, snackbar, updateServiceWorker]);
  return null;
}

// 브라우저 기본 요소를 토큰으로 테마 적용(D14)
function GlobalStyles() {
  return (
    <Global
      styles={(t) => ({
        'html, body': {
          background: t.semantic.background.normal.normal,
          color: t.semantic.label.normal,
          fontFamily:
            "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
          WebkitTextSizeAdjust: '100%',
          overscrollBehaviorY: 'none',
        },
        '::selection': { background: `rgba(var(--semantic-primary-normal-rgb), 0.2)` },
        ':focus-visible': { outline: `2px solid ${t.semantic.primary.normal}`, outlineOffset: 2 },
        '*': { scrollbarColor: `${t.semantic.line.normal.normal} transparent` },
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': { animationDuration: '0.01ms !important', transitionDuration: '0.01ms !important', scrollBehavior: 'auto' },
        },
      })}
    />
  );
}

export function App() {
  return (
    <StoreProvider>
      <GlobalStyles />
      <UpdatePrompt />
      <HashRouter>
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/day/:date/:slug?" element={<Day />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/collect" element={<Collect />} />
          <Route path="/search" element={<Search />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Today />} />
        </Routes>
      </HashRouter>
    </StoreProvider>
  );
}
