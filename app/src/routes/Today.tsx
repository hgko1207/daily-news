import { Box, SectionMessage, TextButton, Typography } from '@wanteddev/wds';
import { IconChevronRightSmall } from '@wanteddev/wds-icon';
import dayjs from 'dayjs';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { issueNumber, kstNow, todayView } from '../data.ts';
import { isStandalone } from '../install.ts';
import { CHIP_HIT, CategoryDot, ErrorView, ListSkeleton, Page, SERIF, kstTime, longDate, useScrollRestore } from '../layout.tsx';
import { useStore } from '../store.tsx';
import { WeatherStrip } from '../weather-strip.tsx';

const HINT_KEY = 'install-hint-dismissed';

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/** 오늘 탭은 앱 제목 대신 제호를 쓴다. 헤더에는 날짜와 검색만 두고, 제호 괘선과 겹치지 않게 구분선을 끈다. */
function TodayPage({ date, children }: { date?: ReactNode; children: ReactNode }) {
  return (
    <Page title={null} leading={date} divider={false}>
      {children}
    </Page>
  );
}

/** 제호(E안): 세리프 "데일리 브리핑" + 이중 괘선 + 호수·시각 한 줄. */
function Masthead({ meta }: { meta?: ReactNode }) {
  return (
    <Box sx={{ paddingTop: 4 }}>
      <Typography
        as="h1"
        variant="title2"
        weight="bold"
        color="semantic.label.normal"
        sx={{ display: 'block', fontFamily: SERIF, fontSize: 36, lineHeight: 1.15, letterSpacing: '-0.03em' }}
      >
        데일리 브리핑
      </Typography>
      <Box
        aria-hidden
        sx={(t) => ({
          boxSizing: 'content-box',
          height: 3,
          marginTop: 12,
          borderTop: `2px solid ${t.semantic.label.normal}`,
          borderBottom: `1px solid ${t.semantic.label.normal}`,
        })}
      />
      {meta}
    </Box>
  );
}

function MetaLine({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingTop: 8, fontVariantNumeric: 'tabular-nums' }}>
      <Typography variant="caption1" weight="medium" color="semantic.label.alternative">
        {left}
      </Typography>
      <Typography variant="caption1" weight="medium" color="semantic.label.alternative" sx={{ textAlign: 'right' }}>
        {right}
      </Typography>
    </Box>
  );
}

export function Today() {
  const { index, online, reloadIndex } = useStore();
  const navigate = useNavigate();
  const [hintHidden, setHintHidden] = useState(() => isStandalone() || readFlag(HINT_KEY));
  useScrollRestore('today', index.status === 'ready');

  if (index.status === 'loading') {
    return (
      <TodayPage>
        <Masthead />
        <ListSkeleton />
      </TodayPage>
    );
  }
  if (index.status === 'error') {
    return (
      <TodayPage>
        <Masthead />
        <ErrorView title="브리핑을 불러오지 못했어요" description="연결되면 불러올게요" onRetry={() => void reloadIndex()} />
      </TodayPage>
    );
  }

  const data = index.data;
  const view = todayView(data);
  const day = data.days.find((d) => d.date === view.date);
  if (!day) {
    return (
      <TodayPage>
        <Masthead />
        <ErrorView description="아직 브리핑이 없어요" />
      </TodayPage>
    );
  }

  const news = day.categories.filter((c) => c.slug !== 'word');
  const word = day.categories.find((c) => c.slug === 'word');
  const headlineLabel = day.headline ? day.categories.find((c) => c.slug === day.headline!.slug)?.label : undefined;
  const issue = issueNumber(data, day.date);
  const href = (slug: string) => `/day/${day.date}/${slug}`;
  const dismissHint = () => {
    setHintHidden(true);
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* 무시 */
    }
  };

  const dateLine = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 3 }}>
      <Typography variant="label2" weight="medium" color="semantic.label.alternative">
        {longDate(day.date)}
      </Typography>
      {/* 오늘이 아닌 브리핑임을 날짜 옆에서 바로 알 수 있게(Design Audit F6) */}
      {!view.isToday && (
        <Typography
          variant="caption1"
          weight="medium"
          color="semantic.label.neutral"
          sx={(t) => ({ padding: '2px 6px', borderRadius: 6, background: t.semantic.fill.normal })}
        >
          {day.date === kstYesterday() ? '어제 브리핑' : '지난 브리핑'}
        </Typography>
      )}
    </Box>
  );

  return (
    <TodayPage date={dateLine}>
      <Masthead
        meta={
          <MetaLine
            left={issue ? `제${issue}호` : ''}
            right={online ? `${kstTime(data.generatedAt)} 업데이트` : `오프라인 · 마지막 업데이트 ${kstTime(data.generatedAt)}`}
          />
        }
      />
      <WeatherStrip />
      {view.notice && (
        <Typography as="p" variant="body2" weight="medium" color="semantic.label.neutral" sx={{ display: 'block', marginTop: 12 }}>
          {view.notice === 'arriving' ? '오늘 브리핑은 10시쯤 도착해요' : '오늘 브리핑이 아직 없어요'}
        </Typography>
      )}

      {day.headline && (
        <Box
          as={Link}
          to={href(day.headline.slug)}
          sx={(t) => ({
            display: 'block',
            padding: '24px 0 12px',
            textDecoration: 'none',
            color: 'inherit',
            borderBottom: `1px solid ${t.semantic.line.normal.normal}`,
            '&:hover .more, &:active .more': { textDecoration: 'underline', textUnderlineOffset: 3 },
          })}
        >
          {headlineLabel && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <CategoryDot slug={day.headline.slug} />
              <Typography variant="label2" weight="bold" color="semantic.label.neutral">
                {headlineLabel}
              </Typography>
            </Box>
          )}
          <Typography
            as="h2"
            variant="heading2"
            weight="bold"
            color="semantic.label.normal"
            sx={{ display: 'block', marginTop: 10, lineHeight: 1.5, wordBreak: 'keep-all' }}
          >
            {day.headline.text}
          </Typography>
          {/* 헤드라인도 링크라는 표시(E안). 블록 전체가 링크라 버튼을 따로 두지 않는다. */}
          <Typography
            className="more"
            variant="label1"
            weight="bold"
            color="semantic.primary.normal"
            sx={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, marginTop: 4 }}
          >
            {headlineLabel ? `${headlineLabel} 전문 읽기` : '전문 읽기'}
            <IconChevronRightSmall aria-hidden />
          </Typography>
        </Box>
      )}

      {!hintHidden && (
        // 안내 전체가 아니라 "방법 보기"만 이동한다. 닫기 클릭이 위로 전달돼 설정으로 가던 문제(F2)
        <SectionMessage
          variant="info"
          closeButton
          onOpenChange={(open) => !open && dismissHint()}
          trailingButton={
            <TextButton size="small" sx={CHIP_HIT} onClick={() => navigate('/settings#install')}>
              방법 보기
            </TextButton>
          }
          // 닫기 버튼 터치 영역 44px(F8). 아이콘 크기와 위치는 그대로 두고 여백으로 넓힌다.
          sx={{ marginTop: 16, '& button[aria-label="Close message"]': { minWidth: 44, minHeight: 44, margin: -12 } }}
        >
          홈 화면에 추가하면 앱처럼 열려요
        </SectionMessage>
      )}

      <Typography
        as="h2"
        variant="caption1"
        weight="bold"
        color="semantic.label.alternative"
        sx={{ display: 'block', margin: '24px 0 0', letterSpacing: '0.1em' }}
      >
        오늘의 지면
      </Typography>
      <Box as="ol" sx={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {news.map((c, i) => (
          <Box as="li" key={c.slug} sx={(t) => ({ '& + &': { borderTop: `1px solid ${t.semantic.line.normal.alternative}` } })}>
            <Box
              as={Link}
              to={href(c.slug)}
              sx={(t) => ({
                display: 'grid',
                gridTemplateColumns: '26px minmax(0, 1fr)',
                columnGap: 8,
                margin: '0 -12px',
                padding: '16px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                color: 'inherit',
                transition: 'background-color 120ms ease-out',
                // 화살표 대신 눌림 배경으로 피드백(E안)
                '@media (hover: hover)': { '&:hover': { background: t.semantic.fill.alternative } },
                '&:active': { background: t.semantic.fill.normal },
              })}
            >
              <Typography
                aria-hidden
                variant="label1"
                weight="medium"
                color="semantic.label.alternative"
                sx={{ fontFamily: SERIF, fontVariantNumeric: 'tabular-nums', lineHeight: '20px' }}
              >
                {String(i + 1).padStart(2, '0')}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 20 }}>
                  <CategoryDot slug={c.slug} />
                  <Typography variant="label2" weight="bold" color="semantic.label.neutral">
                    {c.label}
                  </Typography>
                </Box>
                <Typography
                  variant="body1-reading"
                  weight="medium"
                  color="semantic.label.normal"
                  sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'keep-all' }}
                >
                  {c.summary}
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>

      {word && (
        <Box
          as={Link}
          to={href('word')}
          aria-label={`오늘의 말씀: ${word.summary}`}
          sx={(t) => ({
            display: 'block',
            marginTop: 16,
            padding: '20px 0 8px',
            textDecoration: 'none',
            color: 'inherit',
            borderTop: `2px solid ${t.semantic.label.normal}`,
          })}
        >
          <Typography as="p" variant="caption1" weight="bold" color="semantic.label.alternative" sx={{ display: 'block', letterSpacing: '0.1em' }}>
            오늘의 말씀
          </Typography>
          <Typography
            as="p"
            variant="headline1"
            weight="medium"
            color="semantic.label.normal"
            sx={{ display: 'block', marginTop: 14, fontFamily: SERIF, lineHeight: 1.8, letterSpacing: '-0.01em', wordBreak: 'keep-all' }}
          >
            {word.summary}
          </Typography>
        </Box>
      )}
    </TodayPage>
  );
}

function kstYesterday(): string {
  return dayjs(kstNow().date).subtract(1, 'day').format('YYYY-MM-DD');
}
