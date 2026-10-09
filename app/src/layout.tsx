import {
  BottomNavigation,
  BottomNavigationItem,
  Box,
  FallbackView,
  FallbackViewButton,
  FallbackViewContent,
  FallbackViewText,
  ListCell,
  Skeleton,
  TopNavigation,
  TopNavigationButton,
  Typography,
  addOpacity,
  useTheme,
  type Theme,
} from '@wanteddev/wds';
import { IconArrowLeft, IconCalendar, IconChevronRightSmall, IconHome, IconList, IconSearch, IconSetting } from '@wanteddev/wds-icon';
import dayjs from 'dayjs';
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { dotColor } from './categories.ts';

/** 터치 영역 최소 44×44(Design Audit F8). */
// 레이아웃 크기는 그대로 두고(음수 여백) 눌리는 영역만 44px로. 그냥 키우면 헤더 아이콘이 아래로 밀린다.
export const TOUCH_44 = { minWidth: 44, minHeight: 44, margin: -10 };
/** 칩은 보이는 크기를 유지하고 눌리는 영역만 위아래로 넓혀 44px로 만든다(F8). */
export const CHIP_HIT = { position: "relative" as const, "&::after": { content: "\"\"", position: "absolute" as const, left: 0, right: 0, top: -6, bottom: -6 } };

/** 섹션 제목이 고정 헤더 아래에서 멈추도록 하는 여백(헤더 높이 + 12px). */
export const SCROLL_MARGIN = 'calc(var(--header-h, 145px) + 12px)';

/** 화면에는 숨기고 스크린 리더에만 읽히는 글자. */
export const SR_ONLY = {
  position: 'absolute' as const,
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap' as const,
  border: 0,
};

export const CONTENT_MAX = 680;

/**
 * 보조 텍스트(날짜·호수·캡션·날씨 세부) 색. Montage label.alternative(61%)는 대비 3.7:1이라
 * 같은 색에서 불투명도만 74%로 올린다. 라이트 5.3:1, 다크 4.9:1(Technical Audit P1, .impeccable.md 원칙 5).
 */
export const metaColor = (t: Theme) => addOpacity(t.semantic.label.alternative, 0.74);

/**
 * 세리프는 짧은 정체성 요소(제호·지면 번호·말씀)에만 쓴다. 읽는 문장은 Pretendard(.impeccable.md).
 * Hahmlet은 index.html에서 Google Fonts로 불러오고, 못 불러오면 기기 명조로 대신한다.
 */
const SERIF = "'Hahmlet', 'Noto Serif KR', 'AppleMyungjo', 'Batang', serif";

/**
 * 세리프 정체성 글자의 크기·행간을 한곳에(Design Audit F14). 크기는 Montage 변형과 같은 rem 값이라
 * 기본 글자 크기에서는 그대로고, 기기 글자 크기 설정은 따라간다.
 */
export const SERIF_TYPE = {
  /** 제호 "데일리 브리핑": display3 크기(36px), 제호답게 촘촘한 행간·자간 */
  masthead: { fontFamily: SERIF, fontSize: '2.25rem', lineHeight: 1.15, letterSpacing: '-0.03em' },
  /** 출근·점심·퇴근 기온: title3 크기(24px) */
  temperature: { fontFamily: SERIF, fontSize: '1.5rem', lineHeight: 1.2 },
  /** 말씀 본문(오늘 탭·상세 공통): headline1 크기(18px), 읽기 행간 1.8 */
  word: { fontFamily: SERIF, fontSize: '1.125rem', fontWeight: 500, lineHeight: 1.8, letterSpacing: '-0.01em', wordBreak: 'keep-all' as const },
  /** 지면 번호 01~05: 옆 카테고리 줄(20px)과 높이를 맞춘다 */
  issueIndex: { fontFamily: SERIF, fontVariantNumeric: 'tabular-nums', lineHeight: '20px' },
};

/** 색 점과 라벨 사이(카테고리 줄), 칩과 칩 사이. 역할마다 같은 값을 쓰도록 이름을 붙인다(Design Audit F14). */
export const DOT_LABEL_GAP = 6;
export const CHIP_GAP = 6;
const BOTTOM_NAV_HEIGHT = 64;

// 가로로 돌린 iPhone에서 노치·둥근 모서리 아래로 내용이 들어가지 않게(viewport-fit=cover, Technical Audit P3).
// 헤더·하단 탭은 배경은 끝까지 칠하고 내용만 안쪽으로, 본문은 16px과 안전 영역 중 큰 쪽.
const SAFE_X = { paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' };
const GUTTER_LEFT = 'max(16px, env(safe-area-inset-left))';
const GUTTER_RIGHT = 'max(16px, env(safe-area-inset-right))';

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

/**
 * 모든 화면 공통 뒤로가기(Design Audit F12): 앱 안에서 이동해 왔으면 이전 화면,
 * 링크로 바로 열었으면(이전 기록 없음) fallback으로 간다. React Router는 history.state.idx에 위치를 둔다.
 */
export function BackButton({ fallback }: { fallback: string }) {
  const navigate = useNavigate();
  const back = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  };
  return (
    <TopNavigationButton variant="icon" sx={TOUCH_44} aria-label="뒤로" onClick={back}>
      <IconArrowLeft />
    </TopNavigationButton>
  );
}

export function SearchButton() {
  const navigate = useNavigate();
  return (
    <TopNavigationButton variant="icon" sx={TOUCH_44} aria-label="검색" onClick={() => navigate('/search')}>
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
  /** 헤더 아래 구분선. 오늘 탭은 제호 괘선이 바로 아래 있어 끈다. */
  divider?: boolean;
  /** 제목이 글자만이 아닐 때(날짜 이동 버튼 포함 등) 스크린 리더가 읽을 제목 */
  heading?: string;
  children: ReactNode;
}

function syncHeaderHeight(el: HTMLElement | null) {
  if (el) document.documentElement.style.setProperty('--header-h', `${Math.round(el.getBoundingClientRect().height)}px`);
}

/**
 * 섹션 제목으로 이동. 상세 화면은 로딩이 끝나는 순간 헤더에 탭·칩이 붙는데 ResizeObserver가 한 박자 늦어
 * 검색 결과로 들어오면 제목이 헤더에 가렸다(57px 기준으로 이동). 이동 직전에 헤더 높이를 다시 잰다.
 * CSS scroll-behavior는 JS의 'smooth'를 막지 못해 동작 줄이기 설정도 여기서 본다(Technical Audit P3).
 */
export function scrollToSection(id: string, smooth = false) {
  syncHeaderHeight(document.querySelector('header'));
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  document.getElementById(id)?.scrollIntoView({ behavior: smooth && !reduce ? 'smooth' : 'auto' });
}

export function Page({ title, leading, trailing, toolbar, search = true, divider = true, heading, children }: PageProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const headerRef = useRef<HTMLElement>(null);
  // 고정 헤더의 실제 높이를 --header-h로 내보내 섹션 이동 시 제목이 가려지지 않게 한다(Design Audit F5).
  useLayoutEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => syncHeaderHeight(el));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Montage TopNavigation은 제목을 h2로 고정해 그린다. 화면마다 h1이 없던 문제를 태그를 두 번 두지 않고
  // 화면 제목 단계로 올려 푼다(Technical Audit P2). 제목 요소가 다시 그려질 수 있어 매 렌더 확인한다.
  useLayoutEffect(() => {
    const h = headerRef.current?.querySelector('[data-role="navigation-title"] > h2');
    if (!h) return;
    h.setAttribute('aria-level', '1');
    if (heading) h.setAttribute('aria-label', heading);
    else h.removeAttribute('aria-label');
  });
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
          ...SAFE_X,
          // 검색 버튼의 눌림 표시(Montage with-interaction)가 44px 터치 영역 바깥으로 0.5px 나가 페이지가 옆으로 1px 밀렸다.
          // clip은 스크롤 영역을 만들지 않아 sticky에 영향이 없다.
          overflowX: 'clip',
          background: t.semantic.background.normal.normal,
          borderBottom: divider ? `1px solid ${t.semantic.line.normal.alternative}` : 'none',
        })}
      >
        {/* 배경은 전체 폭, 내용은 본문과 같은 열에 맞춘다(Design Audit F4) */}
        <Box sx={{ maxWidth: CONTENT_MAX, margin: '0 auto' }}>
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
      </Box>
      <Box
        as="main"
        sx={{
          maxWidth: CONTENT_MAX,
          margin: '0 auto',
          padding: `0 ${GUTTER_RIGHT} calc(${BOTTOM_NAV_HEIGHT + 24}px + env(safe-area-inset-bottom)) ${GUTTER_LEFT}`,
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
          ...SAFE_X,
          background: t.semantic.background.normal.normal,
          borderTop: `1px solid ${t.semantic.line.normal.alternative}`,
        })}
      >
        <Box sx={{ maxWidth: CONTENT_MAX, margin: '0 auto' }}>
          {/* Montage 기본 라벨 11px → caption1 크기 12px(Design Audit F9). 탭 라벨은 aria-labelledby로 연결된 span */}
          <BottomNavigation
            value={currentTab(pathname)}
            onValueChange={(v) => navigate(v)}
            sx={{ '[wds-component="bottom-navigation-item"] span': { fontSize: '0.75rem', lineHeight: '1rem' } }}
          >
            {TABS.map((t) => (
              <BottomNavigationItem key={t.value} value={t.value} label={t.label} icon={t.icon} />
            ))}
          </BottomNavigation>
        </Box>
      </Box>
    </>
  );
}

/**
 * 행 전체가 링크인 목록 행. li 안에 진짜 링크를 둬서 목록 의미를 지키고 길게 눌러 새 탭 열기·주소 복사가 된다
 * (Technical Audit P2: li role="link"였음). ListCell의 기본 역할·이름 연결은 링크 기본값으로 되돌린다.
 */
export function LinkCell({ to, chevron = false, children }: { to: string; chevron?: boolean; children: ReactNode }) {
  return (
    <Box as="li">
      <ListCell
        as={Link}
        to={to}
        role={undefined}
        aria-labelledby={undefined}
        aria-describedby={undefined}
        divider
        fillWidth
        trailingContent={chevron ? <IconChevronRightSmall aria-hidden /> : undefined}
        sx={{ minHeight: 44, color: 'inherit', textDecoration: 'none' }}
      >
        {children}
      </ListCell>
    </Box>
  );
}

/**
 * 가로로 넘길 내용이 오른쪽에 더 있는지(표·섹션 칩 줄의 흐림 표시, Design Audit F11).
 * 요소가 로딩 뒤에 생기는 화면이 있어 콜백 ref로 받는다. find는 실제로 스크롤되는 요소(표는 Radix 뷰포트).
 * 내용만 바뀌고 크기는 그대로인 경우(카테고리 전환)를 위해 key가 바뀌면 다시 잰다.
 */
export function useMoreToRight<T extends HTMLElement>(
  find?: (node: T) => HTMLElement | null,
  key?: unknown,
): [(node: T | null) => void, boolean] {
  const [node, setNode] = useState<T | null>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = node && (find ? find(node) : node);
    if (!el) return setMore(false);
    const check = () => setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', check);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node, key]);
  return [setNode, more];
}

/** 오른쪽 가장자리 흐림. 부모는 position: relative. */
export function RightFade({ inset = 0, radius = 0 }: { inset?: number; radius?: number }) {
  return (
    <Box
      aria-hidden
      sx={(t) => ({
        position: 'absolute',
        top: inset,
        right: inset,
        bottom: inset,
        width: 32,
        pointerEvents: 'none',
        borderRadius: `0 ${radius}px ${radius}px 0`,
        background: `linear-gradient(to right, transparent, ${t.semantic.background.normal.normal})`,
      })}
    />
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
    <Typography as="p" variant="caption1" sx={(t) => ({ color: metaColor(t) })}>
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
