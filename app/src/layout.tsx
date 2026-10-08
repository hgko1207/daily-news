import {
  BottomNavigation,
  BottomNavigationItem,
  Box,
  FallbackView,
  FallbackViewButton,
  FallbackViewContent,
  FallbackViewText,
  Skeleton,
  TopNavigation,
  TopNavigationButton,
  Typography,
  useTheme,
} from '@wanteddev/wds';
import { IconCalendar, IconHome, IconList, IconSearch, IconSetting } from '@wanteddev/wds-icon';
import dayjs from 'dayjs';
import { useLayoutEffect, useRef, type ReactNode } from 'react';

/** 섹션 제목이 고정 헤더 아래에서 멈추도록 하는 여백(헤더 높이 + 12px). */
export const SCROLL_MARGIN = 'calc(var(--header-h, 145px) + 12px)';
import { useLocation, useNavigate } from 'react-router';
import { dotColor } from './categories.ts';

export const CONTENT_MAX = 680;
const BOTTOM_NAV_HEIGHT = 64;

const WEEKDAY_FULL = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

/** "10월 6일 화요일" */
export function longDate(date: string): string {
  const d = dayjs(date);
  return `${d.month() + 1}월 ${d.date()}일 ${WEEKDAY_FULL[d.day()]}`;
}

/** "10/6" */
export function shortDate(date: string): string {
  const d = dayjs(date);
  return `${d.month() + 1}/${d.date()}`;
}

/** generatedAt(ISO) → KST "HH:mm" */
export function kstTime(iso: string): string {
  return dayjs(iso).tz('Asia/Seoul').format('HH:mm');
}

const TABS = [
  { value: '/', label: '오늘', icon: <IconHome /> },
  { value: '/calendar', label: '지난 브리핑', icon: <IconCalendar /> },
  { value: '/collect', label: '모아보기', icon: <IconList /> },
  { value: '/settings', label: '설정', icon: <IconSetting /> },
];

function currentTab(pathname: string): string {
  if (pathname.startsWith('/day')) return '/';
  return TABS.find((t) => t.value !== '/' && pathname.startsWith(t.value))?.value ?? (pathname === '/' ? '/' : '');
}

export function SearchButton() {
  const navigate = useNavigate();
  return (
    <TopNavigationButton variant="icon" aria-label="검색" onClick={() => navigate('/search')}>
      <IconSearch />
    </TopNavigationButton>
  );
}

interface PageProps {
  title: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** 헤더 아래에 붙는 영역(카테고리 탭 등) */
  toolbar?: ReactNode;
  /** 설정 화면만 검색 아이콘을 숨긴다(D16) */
  search?: boolean;
  children: ReactNode;
}

export function Page({ title, leading, trailing, toolbar, search = true, children }: PageProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const headerRef = useRef<HTMLElement>(null);
  // 고정 헤더의 실제 높이를 --header-h로 내보내 섹션 이동 시 제목이 가려지지 않게 한다(Design Audit F5).
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const sync = () => document.documentElement.style.setProperty('--header-h', `${Math.round(el.getBoundingClientRect().height)}px`);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <>
      <Box
        ref={headerRef}
        as="header"
        sx={(t) => ({
          position: 'sticky',
          top: 0,
          zIndex: 10,
          paddingTop: 'env(safe-area-inset-top)',
          background: t.semantic.background.normal.normal,
          borderBottom: `1px solid ${t.semantic.line.normal.alternative}`,
        })}
      >
        <TopNavigation
          leadingContent={leading}
          trailingContent={
            <>
              {trailing}
              {search && <SearchButton />}
            </>
          }
          toolbar={toolbar}
        >
          {title}
        </TopNavigation>
      </Box>
      <Box
        as="main"
        sx={{
          maxWidth: CONTENT_MAX,
          margin: '0 auto',
          padding: `0 16px calc(${BOTTOM_NAV_HEIGHT + 24}px + env(safe-area-inset-bottom))`,
        }}
      >
        {children}
      </Box>
      <Box
        as="nav"
        aria-label="주요 메뉴"
        sx={(t) => ({
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
          paddingBottom: 'env(safe-area-inset-bottom)',
          background: t.semantic.background.normal.normal,
          borderTop: `1px solid ${t.semantic.line.normal.alternative}`,
        })}
      >
        <BottomNavigation value={currentTab(pathname)} onValueChange={(v) => navigate(v)}>
          {TABS.map((t) => (
            <BottomNavigationItem key={t.value} value={t.value} label={t.label} icon={t.icon} />
          ))}
        </BottomNavigation>
      </Box>
    </>
  );
}

/** 카테고리 색 점(장식, 스크린 리더에서 숨김). 말씀은 점 없음(D10, D12). */
export function CategoryDot({ slug }: { slug: string }) {
  const theme = useTheme();
  const color = dotColor(theme, slug);
  if (!color) return null;
  return (
    <Box
      as="span"
      aria-hidden
      sx={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }}
    />
  );
}

export function Caption({ children }: { children: ReactNode }) {
  return (
    // assistive(28%)는 대비 4.5:1에 못 미쳐 alternative(61%)를 쓴다(D14).
    <Typography as="p" variant="caption1" color="semantic.label.alternative">
      {children}
    </Typography>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 20 }} aria-busy>
      <Skeleton variant="text" width="70%" height={28} />
      {Array.from({ length: rows }, (_, i) => (
        <Box key={i} sx={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Skeleton variant="text" width="30%" height={16} />
          <Skeleton variant="text" width="95%" height={20} />
        </Box>
      ))}
    </Box>
  );
}

export function ErrorView({
  title,
  description,
  onRetry,
  actionLabel = '다시 시도',
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
  actionLabel?: string;
}) {
  return (
    <FallbackView sx={{ paddingTop: 48 }}>
      <FallbackViewContent>
        <FallbackViewText title={title} description={description} />
      </FallbackViewContent>
      {onRetry && <FallbackViewButton onClick={onRetry}>{actionLabel}</FallbackViewButton>}
    </FallbackView>
  );
}

/** 화면별 스크롤 위치를 sessionStorage에 저장했다가 복원한다(D7: 뒤로가기 시 위치 복원). */
export function useScrollRestore(key: string, ready: boolean) {
  useLayoutEffect(() => {
    if (!ready) return;
    const storageKey = `scroll:${key}`;
    try {
      const saved = sessionStorage.getItem(storageKey);
      window.scrollTo(0, saved ? Number(saved) : 0);
    } catch {
      /* 저장소 접근 불가 시 무시 */
    }
    return () => {
      try {
        sessionStorage.setItem(storageKey, String(window.scrollY));
      } catch {
        /* 무시 */
      }
    };
  }, [key, ready]);
}
