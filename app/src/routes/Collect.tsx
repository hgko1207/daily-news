import { Box, Checkbox, ListCell, SegmentedControl, SegmentedControlItem, TextButton, Typography } from '@wanteddev/wds';
import { IconChevronRightSmall } from '@wanteddev/wds-icon';
import dayjs from 'dayjs';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CATEGORIES } from '../../scripts/parse.ts';
import { Caption, CategoryDot, ErrorView, ListSkeleton, Page, longDate, shortDate, useScrollRestore } from '../layout.tsx';
import { useLoad, useStore } from '../store.tsx';
import type { Action, Aggregates, Ticker } from '../types.ts';

const DONE_KEY = 'actions-done';
const RECENT_DAYS = 14;

function readDone(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DONE_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function Collect() {
  const { aggregates, index } = useStore();
  const load = useLoad(aggregates, index.status === 'ready' ? index.data.generatedAt : 'pending');
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'tickers' ? 'tickers' : 'actions';
  const ticker = params.get('t');
  useScrollRestore(`collect:${tab}:${ticker ?? ''}`, load.status === 'ready');

  const control = (
    <Box sx={{ padding: '8px 16px' }}>
      <SegmentedControl value={tab} onValueChange={(v) => setParams(v === 'tickers' ? { tab: 'tickers' } : {})} size="small">
        <SegmentedControlItem value="actions">액션</SegmentedControlItem>
        <SegmentedControlItem value="tickers">종목</SegmentedControlItem>
      </SegmentedControl>
    </Box>
  );

  return (
    <Page title="모아보기" toolbar={control}>
      {load.status === 'loading' && <ListSkeleton />}
      {load.status === 'error' && <ErrorView title="불러오지 못했어요" description="연결되면 불러올게요" onRetry={load.retry} />}
      {load.status === 'ready' &&
        (tab === 'actions' ? (
          <Actions data={load.data} latest={index.status === 'ready' ? index.data.latestDate : null} />
        ) : ticker ? (
          <TickerTimeline ticker={load.data.tickers.find((t) => t.key === ticker)} />
        ) : (
          <Tickers tickers={load.data.tickers} onOpen={(key) => setParams({ tab: 'tickers', t: key })} />
        ))}
    </Page>
  );
}

/** 액션(D18): 체크 = 완료. 최근 14일 미완료가 기본, 그 이전 미완료는 접고, 완료는 따로 본다. */
function Actions({ data, latest }: { data: Aggregates; latest: string | null }) {
  const [done, setDone] = useState(readDone);
  const [showOld, setShowOld] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const cutoff = dayjs(latest ?? undefined).subtract(RECENT_DAYS, 'day').format('YYYY-MM-DD');

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(done);
    if (checked) next.add(id);
    else next.delete(id);
    setDone(next);
    try {
      localStorage.setItem(DONE_KEY, JSON.stringify([...next]));
    } catch {
      /* 저장 실패 시 이번 세션에서만 유지 */
    }
  };

  if (!data.actions.length) return <ErrorView description="아직 모인 액션이 없어요" />;

  const open = data.actions.filter((a) => !done.has(a.id));
  const recent = open.filter((a) => a.date > cutoff);
  const old = open.filter((a) => a.date <= cutoff);
  const completed = data.actions.filter((a) => done.has(a.id));

  return (
    <Box sx={{ paddingTop: 8 }}>
      {recent.length ? (
        <ActionList items={recent} done={done} onToggle={toggle} />
      ) : (
        <Box sx={{ padding: '32px 0 16px', textAlign: 'center' }}>
          <Typography as="p" variant="body1" weight="bold" sx={{ display: 'block' }}>
            최근 2주 액션을 다 해냈어요
          </Typography>
        </Box>
      )}
      {old.length > 0 && (
        <TextButton color="assistive" size="small" onClick={() => setShowOld(!showOld)} sx={{ margin: '16px 0 4px' }}>
          지난 액션 {old.length}개 {showOld ? '접기' : '보기'}
        </TextButton>
      )}
      {showOld && <ActionList items={old} done={done} onToggle={toggle} />}
      {completed.length > 0 && (
        <TextButton color="assistive" size="small" onClick={() => setShowDone(!showDone)} sx={{ margin: '16px 0 4px', display: 'flex' }}>
          완료한 항목 {completed.length}개 {showDone ? '접기' : '보기'}
        </TextButton>
      )}
      {showDone && <ActionList items={completed} done={done} onToggle={toggle} />}
    </Box>
  );
}

const LABEL = new Map(CATEGORIES.map((c) => [c.slug, c.label]));

/** 날짜별로 묶고(목록이 87개까지 늘어남) 카테고리는 색 점 + 글자로 표시한다(Design Audit F3). */
function ActionList({ items, done, onToggle }: { items: Action[]; done: Set<string>; onToggle: (id: string, checked: boolean) => void }) {
  const groups = new Map<string, Action[]>();
  for (const a of items) groups.set(a.date, [...(groups.get(a.date) ?? []), a]);
  return (
    <>
      {[...groups].map(([date, group]) => (
        <Box as="section" key={date} aria-label={longDate(date)}>
          <Box
            sx={(t) => ({
              position: 'sticky',
              top: 'var(--header-h, 0px)',
              zIndex: 1,
              padding: '16px 0 6px',
              background: t.semantic.background.normal.normal,
            })}
          >
            <Typography as="h3" variant="label1" weight="bold" color="semantic.label.normal">
              {longDate(date)}
            </Typography>
          </Box>
          <ActionItems items={group} done={done} onToggle={onToggle} />
        </Box>
      ))}
    </>
  );
}

function ActionItems({ items, done, onToggle }: { items: Action[]; done: Set<string>; onToggle: (id: string, checked: boolean) => void }) {
  return (
    <Box as="ul" sx={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {items.map((a) => {
        const id = `act-${a.id}`;
        const checked = done.has(a.id);
        return (
          <Box as="li" key={a.id} sx={(t) => ({ display: 'flex', gap: 12, padding: '12px 0', borderBottom: `1px solid ${t.semantic.line.normal.alternative}` })}>
            <Box sx={{ paddingTop: 2 }}>
              <Checkbox id={id} checked={checked} onCheckedChange={(c) => onToggle(a.id, c === true)} />
            </Box>
            <Box as="label" htmlFor={id} sx={{ display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer', minWidth: 0 }}>
              <Typography
                variant="body2-reading"
                color={checked ? 'semantic.label.assistive' : 'semantic.label.normal'}
                sx={{ textDecoration: checked ? 'line-through' : 'none' }}
              >
                {a.text}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CategoryDot slug={a.slug} />
                <Caption>{LABEL.get(a.slug) ?? a.slug}</Caption>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

/** 종목(D17): 최근 언급일 순, 행에 "최근 M/D · N회". */
function Tickers({ tickers, onOpen }: { tickers: Ticker[]; onOpen: (key: string) => void }) {
  if (!tickers.length) return <ErrorView description="아직 모인 종목이 없어요" />;
  return (
    <Box as="ul" sx={{ listStyle: 'none', margin: 0, padding: '8px 0 0' }}>
      {tickers.map((t) => (
        <ListCell
          key={t.key}
          as="li"
          divider
          fillWidth
          role="link"
          tabIndex={0}
          onClick={() => onOpen(t.key)}
          onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && onOpen(t.key)}
          trailingContent={<IconChevronRightSmall aria-hidden />}
          sx={{ cursor: 'pointer', minHeight: 44 }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="body1" weight="bold">
              {t.name}
              {t.code && (
                <Typography as="span" variant="label2" color="semantic.label.assistive" sx={{ marginLeft: 6 }}>
                  {t.code}
                </Typography>
              )}
            </Typography>
            <Caption>
              최근 {shortDate(t.lastDate)} · {t.count}회
            </Caption>
          </Box>
        </ListCell>
      ))}
    </Box>
  );
}

function TickerTimeline({ ticker }: { ticker?: Ticker }) {
  const navigate = useNavigate();
  if (!ticker) return <ErrorView description="종목을 찾지 못했어요" />;
  return (
    <Box sx={{ paddingTop: 16 }}>
      <TextButton color="assistive" size="small" onClick={() => navigate('/collect?tab=tickers')}>
        ‹ 종목 목록
      </TextButton>
      <Typography as="h2" variant="heading2" weight="bold" sx={{ display: 'block', margin: '12px 0 4px' }}>
        {ticker.name}
      </Typography>
      <Caption>
        {ticker.code ? `${ticker.code} · ` : ''}언급 {ticker.count}회
      </Caption>
      <Box as="ol" sx={{ listStyle: 'none', margin: '16px 0 0', padding: 0 }}>
        {ticker.mentions.map((m, i) => (
          <ListCell
            key={`${m.date}-${i}`}
            as="li"
            divider
            fillWidth
            role="link"
            tabIndex={0}
            onClick={() => navigate(`/day/${m.date}/invest`)}
            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && navigate(`/day/${m.date}/invest`)}
            sx={{ cursor: 'pointer' }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Caption>{shortDate(m.date)}</Caption>
              <Typography variant="body2-reading">{m.text || '언급됨'}</Typography>
            </Box>
          </ListCell>
        ))}
      </Box>
    </Box>
  );
}
