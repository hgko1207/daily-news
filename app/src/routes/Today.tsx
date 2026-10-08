import { Box, ListCell, SectionMessage, TextButton, Typography } from '@wanteddev/wds';
import { IconChevronRightSmall } from '@wanteddev/wds-icon';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { kstNow, todayView } from '../data.ts';
import dayjs from 'dayjs';
import { isStandalone } from '../install.ts';
import { Caption, CategoryDot, ErrorView, ListSkeleton, Page, kstTime, longDate, useScrollRestore } from '../layout.tsx';
import { useStore } from '../store.tsx';

const HINT_KEY = 'install-hint-dismissed';

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function Today() {
  const { index, online, reloadIndex } = useStore();
  const navigate = useNavigate();
  const [hintHidden, setHintHidden] = useState(() => isStandalone() || readFlag(HINT_KEY));
  useScrollRestore('today', index.status === 'ready');

  if (index.status === 'loading') {
    return (
      <Page title="오늘">
        <ListSkeleton />
      </Page>
    );
  }
  if (index.status === 'error') {
    return (
      <Page title="오늘">
        <ErrorView title="브리핑을 불러오지 못했어요" description="연결되면 불러올게요" onRetry={() => void reloadIndex()} />
      </Page>
    );
  }

  const data = index.data;
  const view = todayView(data);
  const day = data.days.find((d) => d.date === view.date);
  if (!day) {
    return (
      <Page title="오늘">
        <ErrorView description="아직 브리핑이 없어요" />
      </Page>
    );
  }

  const news = day.categories.filter((c) => c.slug !== 'word');
  const word = day.categories.find((c) => c.slug === 'word');
  const open = (slug: string) => navigate(`/day/${day.date}/${slug}`);
  const dismissHint = () => {
    setHintHidden(true);
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      /* 무시 */
    }
  };

  return (
    <Page title="데일리 브리핑">
      <Box as="section" aria-label="날짜" sx={{ padding: '20px 0 4px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Typography as="p" variant="headline2" weight="bold" color="semantic.label.normal">
            {longDate(day.date)}
          </Typography>
          {/* 오늘이 아닌 브리핑임을 날짜 옆에서 바로 알 수 있게(Design Audit F6) */}
          {!view.isToday && (
            <Typography
              variant="label2"
              weight="medium"
              color="semantic.label.neutral"
              sx={(t) => ({ padding: '2px 8px', borderRadius: 6, background: t.semantic.fill.normal })}
            >
              {day.date === kstYesterday() ? '어제 브리핑' : '지난 브리핑'}
            </Typography>
          )}
        </Box>
        {view.notice && (
          <Typography as="p" variant="body2" weight="medium" color="semantic.label.neutral" sx={{ display: 'block', marginTop: 4 }}>
            {view.notice === 'arriving' ? '오늘 브리핑은 10시쯤 도착해요' : '오늘 브리핑이 아직 없어요'}
          </Typography>
        )}
        <Caption>
          {online ? `${kstTime(data.generatedAt)} 업데이트` : `오프라인 · 마지막 업데이트 ${kstTime(data.generatedAt)}`}
        </Caption>
      </Box>

      {day.headline && (
        <Box
          as="button"
          type="button"
          onClick={() => open(day.headline!.slug)}
          sx={{ display: 'block', width: '100%', textAlign: 'left', padding: '16px 0 20px', background: 'none', border: 0, cursor: 'pointer' }}
        >
          <Typography as="h2" variant="title2" weight="bold" color="semantic.label.normal" sx={{ display: 'block' }}>
            {day.headline.text}
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
            <TextButton size="small" onClick={() => navigate('/settings#install')}>
              방법 보기
            </TextButton>
          }
          sx={{ marginBottom: 12 }}
        >
          홈 화면에 추가하면 앱처럼 열려요
        </SectionMessage>
      )}

      <Box as="ul" aria-label="카테고리별 핵심" sx={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {news.map((c) => (
          <ListCell
            key={c.slug}
            as="li"
            divider
            fillWidth
            verticalPadding="medium"
            onClick={() => open(c.slug)}
            role="link"
            tabIndex={0}
            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && open(c.slug)}
            trailingContent={<IconChevronRightSmall aria-hidden />}
            sx={{ cursor: 'pointer', minHeight: 44 }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CategoryDot slug={c.slug} />
                <Typography variant="label1" weight="bold" color="semantic.label.normal">
                  {c.label}
                </Typography>
              </Box>
              <Typography
                variant="body2-reading"
                color="semantic.label.alternative"
                sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              >
                {c.summary}
              </Typography>
            </Box>
          </ListCell>
        ))}
      </Box>

      {word && (
        <Box
          as="button"
          type="button"
          onClick={() => open('word')}
          aria-label={`오늘의 말씀: ${word.summary}`}
          sx={(t) => ({
            display: 'block',
            width: '100%',
            textAlign: 'left',
            margin: '28px 0 0',
            padding: '4px 0 4px 16px',
            background: 'none',
            border: 0,
            borderLeft: `3px solid ${t.semantic.line.solid.normal}`,
            cursor: 'pointer',
          })}
        >
          <Typography as="p" variant="caption1" color="semantic.label.assistive" sx={{ display: 'block', marginBottom: 6 }}>
            오늘의 말씀
          </Typography>
          <Typography as="p" variant="body1-reading" color="semantic.label.normal" sx={{ display: 'block' }}>
            {word.summary}
          </Typography>
        </Box>
      )}
    </Page>
  );
}

function kstYesterday(): string {
  return dayjs(kstNow().date).subtract(1, 'day').format('YYYY-MM-DD');
}
