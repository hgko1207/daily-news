import { Box, Chip, IconButton, ListCell, Typography } from '@wanteddev/wds';
import { IconChevronLeft, IconChevronRight, IconChevronRightSmall } from '@wanteddev/wds-icon';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Caption, CategoryDot, ErrorView, ListSkeleton, Page, longDate } from '../layout.tsx';
import { useStore } from '../store.tsx';
import type { IndexDay } from '../types.ts';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 지난 브리핑(Design Review D5): 달력 + 선택한 날 미리보기.
 * Montage DateCalendar에는 날짜별 표시·비활성화 API가 없어 같은 토큰으로 격자를 직접 그린다.
 */
export function Calendar() {
  const { index, reloadIndex } = useStore();
  const navigate = useNavigate();
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0 8px' }}>
        <IconButton aria-label="이전 달" disabled={!canPrev} onClick={() => setMonth(shown.subtract(1, 'month').format('YYYY-MM-DD'))}>
          <IconChevronLeft />
        </IconButton>
        <Typography as="h2" variant="headline1" weight="bold" aria-live="polite">
          {shown.year()}년 {shown.month() + 1}월
        </Typography>
        <IconButton aria-label="다음 달" disabled={!canNext} onClick={() => setMonth(shown.add(1, 'month').format('YYYY-MM-DD'))}>
          <IconChevronRight />
        </IconButton>
      </Box>

      <Box role="group" aria-label="카테고리 필터" sx={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12 }}>
        <Chip size="small" variant="outlined" active={!filter} onClick={() => setFilter(null)}>
          전체
        </Chip>
        {categories.map((c) => (
          <Chip key={c.slug} size="small" variant="outlined" active={filter === c.slug} onClick={() => setFilter(filter === c.slug ? null : c.slug)}>
            {c.label}
          </Chip>
        ))}
      </Box>

      <Box role="grid" aria-label="날짜 선택" sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 4 }}>
        {WEEK.map((w) => (
          <Typography key={w} role="columnheader" variant="caption1" color="semantic.label.assistive" align="center" sx={{ display: 'block', padding: '4px 0' }}>
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
              role="gridcell"
              aria-selected={isSel}
              aria-label={`${longDate(date)}${enabled ? '' : ', 브리핑 없음'}`}
              disabled={!enabled}
              onClick={() => setSelected(date)}
              sx={(t) => ({
                position: 'relative',
                width: 44,
                height: 44,
                justifySelf: 'center',
                border: 0,
                borderRadius: 22,
                background: isSel ? t.semantic.primary.normal : 'transparent',
                color: isSel ? t.semantic.static.white : enabled ? t.semantic.label.normal : t.semantic.label.disable,
                fontFamily: 'inherit',
                fontSize: 15,
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
                <ListCell
                  key={c.slug}
                  as="li"
                  divider
                  fillWidth
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/day/${preview.date}/${c.slug}`)}
                  onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && navigate(`/day/${preview.date}/${c.slug}`)}
                  trailingContent={<IconChevronRightSmall aria-hidden />}
                  sx={{ cursor: 'pointer', minHeight: 44 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <CategoryDot slug={c.slug} />
                    <Typography variant="label1" weight="bold" sx={{ flexShrink: 0 }}>
                      {c.label}
                    </Typography>
                    <Typography variant="body2" color="semantic.label.alternative" noWrap>
                      {c.summary}
                    </Typography>
                  </Box>
                </ListCell>
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
