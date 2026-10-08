import { Box, Chip, Skeleton, Tab, TabList, TabListItem, TopNavigationButton, Typography } from '@wanteddev/wds';
import { IconChevronLeft, IconChevronRight } from '@wanteddev/wds-icon';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { BackButton, CHIP_HIT, ErrorView, Page, TOUCH_44, longDate, shortDate, useScrollRestore } from '../layout.tsx';
import { Markdown, idFromHash, sectionId } from '../markdown.tsx';
import { useLoad, useStore } from '../store.tsx';

const SWIPE_MIN_X = 60;
const SWIPE_MAX_Y = 40;

export function Day() {
  const { date = '', slug } = useParams();
  const navigate = useNavigate();
  const { index, day } = useStore();
  const load = useLoad(() => day(date), date);
  const touch = useRef<{ x: number; y: number; blocked: boolean } | null>(null);

  const dates = index.status === 'ready' ? index.data.days.map((d) => d.date) : [];
  const pos = dates.indexOf(date);
  const newer = pos > 0 ? dates[pos - 1] : undefined;
  const older = pos >= 0 && pos < dates.length - 1 ? dates[pos + 1] : undefined;

  const entries = load.status === 'ready' ? load.data.entries : [];
  const active = entries.find((e) => e.slug === slug) ?? entries[0];
  useScrollRestore(`day:${date}:${active?.slug ?? ''}`, load.status === 'ready');

  // 검색 결과에서 들어오면 해당 섹션으로 이동
  const { hash } = useLocation();
  useEffect(() => {
    if (load.status === 'ready' && hash) document.getElementById(idFromHash(hash))?.scrollIntoView();
  }, [load.status, hash, active?.slug]);

  // 선택된 카테고리 탭이 가로 목록 밖에 있으면 보이도록 옮긴다(Design Audit F10)
  useEffect(() => {
    if (load.status !== 'ready') return;
    // Radix 스크롤 영역이 자리 잡은 뒤에 옮겨야 적용된다
    const id = window.setTimeout(() => {
      const tab = document.querySelector<HTMLElement>('[wds-component="tab-list"] [role="tab"][aria-selected="true"]');
      tab?.scrollIntoView({ inline: 'center', block: 'nearest' });
    }, 50);
    return () => window.clearTimeout(id);
  }, [load.status, active?.slug]);

  // 그날 없는 카테고리로 들어오면 첫 카테고리로 바꾼다(D7: 탭 숨김)
  useEffect(() => {
    if (load.status === 'ready' && active && active.slug !== slug) navigate(`/day/${date}/${active.slug}`, { replace: true });
  }, [load.status, active, slug, date, navigate]);

  const goCategory = (step: 1 | -1) => {
    const i = entries.findIndex((e) => e.slug === active?.slug);
    const next = entries[i + step];
    if (next) navigate(`/day/${date}/${next.slug}`, { replace: true });
  };

  const header = {
    leading: <BackButton fallback="/" />,
    title: (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <TopNavigationButton
          variant="icon"
          sx={TOUCH_44}
          aria-label="이전 날짜"
          disabled={!older}
          onClick={() => older && navigate(`/day/${older}/${active?.slug ?? ''}`)}
        >
          <IconChevronLeft />
        </TopNavigationButton>
        <Typography variant="headline2" weight="bold">
          {shortDate(date)}
        </Typography>
        <TopNavigationButton
          variant="icon"
          sx={TOUCH_44}
          aria-label="다음 날짜"
          disabled={!newer}
          onClick={() => newer && navigate(`/day/${newer}/${active?.slug ?? ''}`)}
        >
          <IconChevronRight />
        </TopNavigationButton>
      </Box>
    ),
  };

  if (load.status === 'loading') {
    return (
      <Page {...header}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 24 }} aria-busy>
          <Skeleton variant="text" width="60%" height={28} />
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} variant="text" width={`${90 - (i % 3) * 10}%`} height={18} />
          ))}
        </Box>
      </Page>
    );
  }

  if (load.status === 'error') {
    const nearest = index.status === 'ready' ? nearestDate(dates, date) : undefined;
    const missing = index.status === 'ready' && pos === -1;
    return (
      <Page {...header}>
        {missing ? (
          <ErrorView
            title="이 날짜엔 브리핑이 없어요"
            description={nearest ? `가장 가까운 ${shortDate(nearest)} 브리핑을 볼 수 있어요` : '다른 날짜를 선택해 보세요'}
            onRetry={nearest ? () => navigate(`/day/${nearest}`, { replace: true }) : undefined}
            actionLabel={nearest ? `${shortDate(nearest)} 보기` : undefined}
          />
        ) : (
          <ErrorView title="브리핑을 불러오지 못했어요" description="연결되면 불러올게요" onRetry={load.retry} />
        )}
      </Page>
    );
  }

  if (!active) return <Page {...header}><ErrorView description="이 날짜엔 브리핑이 없어요" /></Page>;

  const showOutline = active.outline.length >= 3;
  const toolbar = (
    <Box>
      <Tab value={active.slug} onValueChange={(v) => navigate(`/day/${date}/${v}`, { replace: true })}>
        {/* 첫 탭이 화면 끝에 붙어 잘려 보이던 문제: 탭 목록 안쪽 좌우 16px 여백(Design Audit F10) */}
        <TabList
          resize="hug"
          size="small"
          sx={{
            '& [data-radix-scroll-area-content] > div': { paddingLeft: 16, paddingRight: 16 },
          }}
        >
          {entries.map((e) => (
            <TabListItem key={e.slug} value={e.slug}>
              {e.label}
            </TabListItem>
          ))}
        </TabList>
      </Tab>
      {showOutline && (
        <Box
          data-no-swipe
          aria-label="섹션 바로가기"
          sx={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 16px', scrollbarWidth: 'none' }}
        >
          {active.outline.map((h) => (
            <Chip
              sx={CHIP_HIT}
              key={h}
              size="small"
              variant="outlined"
              onClick={() => document.getElementById(sectionId(h))?.scrollIntoView({ behavior: 'smooth' })}
            >
              {chipLabel(h)}
            </Chip>
          ))}
        </Box>
      )}
    </Box>
  );

  return (
    <Page {...header} toolbar={toolbar}>
      <Box
        as="article"
        aria-label={`${active.label} ${longDate(date)}`}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (!t) return;
          const blocked = !!(e.target as HTMLElement).closest('[data-no-swipe]');
          touch.current = { x: t.clientX, y: t.clientY, blocked };
        }}
        onTouchEnd={(e) => {
          const start = touch.current;
          const t = e.changedTouches[0];
          touch.current = null;
          if (!start || !t || start.blocked) return;
          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          if (Math.abs(dx) >= SWIPE_MIN_X && Math.abs(dy) <= SWIPE_MAX_Y) goCategory(dx < 0 ? 1 : -1);
        }}
        sx={{ paddingTop: 8, minHeight: '60vh' }}
      >
        <Markdown source={active.markdown} />
      </Box>
    </Page>
  );
}

/** 헤딩에서 숫자 접두어·괄호를 빼고 앞 6자(D9). */
const CHIP_MAX = 12;

/**
 * 헤딩에서 숫자 접두어·괄호를 빼고 12자까지 그대로 보여준다.
 * 길면 단어 경계(공백·가운뎃점)에서 자른다. 설계(D9)의 6자 자르기는 "관심 종목 …"처럼 단어 중간을 잘라서 바꿈(Design Audit F13).
 */
function chipLabel(heading: string): string {
  const clean = heading.replace(/^\d+\.\s*/, '').replace(/\s*\(.*\)\s*/g, ' ').trim();
  if (clean.length <= CHIP_MAX) return clean;
  const cut = clean.slice(0, CHIP_MAX);
  const boundary = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf('·'));
  return `${boundary > 3 ? cut.slice(0, boundary) : cut}…`;
}

function nearestDate(dates: string[], target: string): string | undefined {
  const t = Date.parse(target);
  if (Number.isNaN(t)) return dates[0];
  return [...dates].sort((a, b) => Math.abs(Date.parse(a) - t) - Math.abs(Date.parse(b) - t))[0];
}
