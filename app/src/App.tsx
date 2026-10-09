import { Global, useSnackbar } from '@wanteddev/wds';
import { Suspense, lazy, useEffect } from 'react';
import { HashRouter, Route, Routes } from 'react-router';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { ListSkeleton, Page } from './layout.tsx';
import { Today } from './routes/Today.tsx';
import { StoreProvider } from './store.tsx';

/**
 * 오늘 탭만 첫 로드에 넣고 나머지 화면은 따로 받는다(Technical Audit P2).
 * 마크다운 렌더러(약 47KB gzip)가 상세 화면에만 필요해 첫 화면 JS에서 빠진다.
 * 화면 이동은 React Router가 startTransition으로 감싸 이전 화면을 유지한 채 받으므로 빈 화면이 끼지 않는다.
 */
const loaders = {
  day: () => import('./routes/Day.tsx'),
  calendar: () => import('./routes/Calendar.tsx'),
  collect: () => import('./routes/Collect.tsx'),
  search: () => import('./routes/Search.tsx'),
  settings: () => import('./routes/Settings.tsx'),
};
const Day = lazy(() => loaders.day().then((m) => ({ default: m.Day })));
const Calendar = lazy(() => loaders.calendar().then((m) => ({ default: m.Calendar })));
const Collect = lazy(() => loaders.collect().then((m) => ({ default: m.Collect })));
const Search = lazy(() => loaders.search().then((m) => ({ default: m.Search })));
const Settings = lazy(() => loaders.settings().then((m) => ({ default: m.Settings })));

/** 첫 화면이 뜨고 한가할 때 나머지 화면 코드를 미리 받아 둔다. 처음 누를 때도 기다리지 않게. */
function usePrefetchRoutes() {
  useEffect(() => {
    const run = () => Object.values(loaders).forEach((load) => void load().catch(() => {}));
    // Safari는 requestIdleCallback이 없을 수 있다
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(run, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(run, 1500);
    return () => window.clearTimeout(id);
  }, []);
}

/** 상세 화면 링크로 바로 열었을 때만 잠깐 보인다. */
function RouteFallback() {
  return (
    <Page title={null} search={false}>
      <ListSkeleton />
    </Page>
  );
}

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

/**
 * 상태 표시줄(theme-color)을 앱 배경에 맞춘다. 설정에서 고른 테마가 시스템과 달라도 따라간다(Technical Audit P2).
 * 테마 토큰은 var(--…) 문자열이라 meta에 못 넣는다. data-theme이 바뀔 때 계산된 값을 읽는다.
 */
function ThemeColorSync() {
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const bg = getComputedStyle(root).getPropertyValue('--semantic-background-normal-normal').trim();
      if (!bg) return;
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
        m.content = bg;
      });
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
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
  usePrefetchRoutes();
  return (
    <StoreProvider>
      <GlobalStyles />
      <ThemeColorSync />
      <UpdatePrompt />
      <HashRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/day/:date/:slug?" element={<Day />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/collect" element={<Collect />} />
            <Route path="/search" element={<Search />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Today />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </StoreProvider>
  );
}
