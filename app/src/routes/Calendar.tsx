import { Box, Chip, IconButton, Typography } from '@wanteddev/wds';
import { IconChevronLeft, IconChevronRight } from '@wanteddev/wds-icon';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { CHIP_GAP, CHIP_HIT, Caption, CategoryDot, DOT_LABEL_GAP, ErrorView, LinkCell, ListSkeleton, Page, TOUCH_44, longDate, metaColor } from '../layout.tsx';
import { useStore } from '../store.tsx';
import type { IndexDay } from '../types.ts';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 지난 브리핑(Design Review D5): 달력 + 선택한 날 미리보기.
 * Montage DateCalendar에는 날짜별 표시·비활성화 API가 없어 같은 토큰으로 격자를 직접 그린다.
 */
export function Calendar() {
  const { index, reloadIndex } = useStore();
  const data = index.status === 'ready' ? index.data : null;
  const [selected, setSelected] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  const byDate = useMemo(() => new Map((data?.days ?? []).map((d) => [d.date, d])), [data]);
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const d of data?.days ?? []) for (const c of d.categories) seen.set(c.slug, c.label);
    return [...seen].map(([slug, label]) => ({ slug, label }));
  }, [data]);

  if (index.status === 'loading') return <Page title="지난 브리핑"><ListSkeleton /></Page>;
  if (!data) {
    return (
      <Page title="지난 브리핑">
        <ErrorView title="브리핑을 불러오지 못했어요" description="연결되면 불러올게요" onRetry={() => void reloadIndex()} />
      </Page>
    );
  }

  const latest = data.latestDate ?? dayjs().format('YYYY-MM-DD');
  const sel = selected ?? latest;
  const shown = dayjs(month ?? sel).startOf('month');
  const firstDate = data.days.at(-1)?.date ?? latest;
  const canPrev = shown.isAfter(dayjs(firstDate).startOf('month'));
  const canNext = shown.isBefore(dayjs(latest).startOf('month'));
  const has = (date: string) => {
    const d = byDate.get(date);
    return !!d && (!filter || d.categories.some((c) => c.slug === filter));
  };

  const cells: (string | null)[] = [
    ...Array.from({ length: shown.day() }, () => null),
    ...Array.from({ length: shown.daysInMonth() }, (_, i) => shown.date(i + 1).format('YYYY-MM-DD')),
  ];
  const preview: IndexDay | undefined = byDate.get(sel);

  return (
    <Page title="지난 브리핑">
      {/* 아래 여백 10px + 필터 줄 위 여백 6px: 달 이동 버튼과 필터 칩의 눌리는 영역(44px)이 겹치지 않게 */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0 10px' }}>
        <IconButton aria-label="이전 달" sx={TOUCH_44} disabled={!canPrev} onClick={() => setMonth(shown.subtract(1, 'month').format('YYYY-MM-DD'))}>
          <IconChevronLeft />
        </IconButton>
        <Typography as="h2" variant="headline1" weight="bold" aria-live="polite">
          {shown.year()}년 {shown.month() + 1}월
        </Typography>
        <IconButton aria-label="다음 달" sx={TOUCH_44} disabled={!canNext} onClick={() => setMonth(shown.add(1, 'month').format('YYYY-MM-DD'))}>
          <IconChevronRight />
        </IconButton>
      </Box>

      {/* 가로 스크롤 줄은 세로로도 잘리므로, 칩의 눌리는 영역(위로 6px)이 들어갈 위 여백을 둔다 */}
      <Box role="group" aria-label="카테고리 필터" sx={{ display: 'flex', gap: CHIP_GAP, overflowX: 'auto', padding: '6px 0 12px' }}>
        <Chip size="small" variant="outlined" sx={CHIP_HIT} active={!filter} onClick={() => setFilter(null)}>
          전체
        </Chip>
        {categories.map((c) => (
          <Chip key={c.slug} size="small" variant="outlined" sx={CHIP_HIT} active={filter === c.slug} onClick={() => setFilter(filter === c.slug ? null : c.slug)}>
            {c.label}
          </Chip>
        ))}
      </Box>

      {/*
        방향키 이동이 없는 grid 역할은 구조만 약속하고 동작은 안 해서 뺐다(Technical Audit P2).
        날짜 버튼마다 요일까지 든 이름이 있어 요일 머리글은 화면용으로만 둔다.
      */}
      <Box role="group" aria-label="날짜 선택" sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', rowGap: 4 }}>
        {WEEK.map((w) => (
          <Typography key={w} aria-hidden variant="caption1" align="center" sx={(t) => ({ display: 'block', padding: '4px 0', color: metaColor(t) })}>
            {w}
          </Typography>
        ))}
        {cells.map((date, i) => {
          if (!date) return <Box key={`blank-${i}`} />;
          const enabled = has(date);
          const isSel = date === sel;
          return (
            <Box
              key={date}
              as="button"
              type="button"
              aria-pressed={isSel}
              aria-label={`${longDate(date)}${enabled ? '' : ', 브리핑 없음'}`}
              disabled={!enabled}
              onClick={() => setSelected(date)}
              sx={(t) => ({
                position: 'relative',
                // 44px 고정이면 7칸이 308px이라 폭 340px 미만 화면에서 넘쳤다(Technical Audit P2, WCAG 1.4.10).
                // 칸 폭까지 줄어들되 44px를 넘지 않는다. 폭 320 화면에서 41px.
                width: '100%',
                maxWidth: 44,
                aspectRatio: '1',
                justifySelf: 'center',
                border: 0,
                borderRadius: '50%',
                background: isSel ? t.semantic.primary.normal : 'transparent',
                // 다크의 primary.normal(#3385FF) 위 흰 글자는 3.5:1이라 다크에서만 한 단계 진하게(#0066FF, 4.8:1). 라이트는 그대로
                '[data-theme="dark"] &': isSel ? { background: t.semantic.primary.heavy } : undefined,
                color: isSel ? t.semantic.static.white : enabled ? t.semantic.label.normal : t.semantic.label.disable,
                fontFamily: 'inherit',
                fontSize: '0.9375rem', // body2 크기. 버튼이라 Typography 대신 크기만 맞춘다
                fontWeight: isSel ? 700 : 500,
                fontVariantNumeric: 'tabular-nums',
                cursor: enabled ? 'pointer' : 'default',
                '&::after': enabled && !isSel
                  ? {
                      content: '""',
                      position: 'absolute',
                      left: '50%',
                      bottom: 6,
                      width: 4,
                      height: 4,
                      marginLeft: -2,
                      borderRadius: '50%',
                      background: t.semantic.primary.normal,
                    }
                  : undefined,
              })}
            >
              {dayjs(date).date()}
            </Box>
          );
        })}
      </Box>

      <Box as="section" aria-label="선택한 날 미리보기" sx={{ paddingTop: 20 }}>
        {preview ? (
          <>
            <Caption>{longDate(preview.date)}</Caption>
            {preview.headline && (
              <Typography as="p" variant="headline1" weight="bold" sx={{ display: 'block', margin: '6px 0 8px' }}>
                {preview.headline.text}
              </Typography>
            )}
            <Box as="ul" sx={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {preview.categories.map((c) => (
                <LinkCell key={c.slug} to={`/day/${preview.date}/${c.slug}`} chevron>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: DOT_LABEL_GAP, minWidth: 0 }}>
                    <CategoryDot slug={c.slug} />
                    <Typography variant="label1" weight="bold" sx={{ flexShrink: 0 }}>
                      {c.label}
                    </Typography>
                    <Typography variant="body2" color="semantic.label.neutral" noWrap>
                      {c.summary}
                    </Typography>
                  </Box>
                </LinkCell>
              ))}
            </Box>
          </>
        ) : (
          <Caption>날짜를 선택하면 그날 브리핑을 볼 수 있어요</Caption>
        )}
      </Box>
    </Page>
  );
}
