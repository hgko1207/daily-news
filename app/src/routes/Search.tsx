import { Box, Chip, ListCell, SearchField, TopNavigationButton, Typography } from '@wanteddev/wds';
import { IconArrowLeft } from '@wanteddev/wds-icon';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CHIP_HIT, Caption, CategoryDot, ErrorView, Page, TOUCH_44, shortDate } from '../layout.tsx';
import { sectionId } from '../markdown.tsx';
import { highlightSegments, searchDocs, searchTerms } from '../search.ts';
import { useLoad, useStore } from '../store.tsx';

const DEBOUNCE_MS = 200;

/** 검색 텍스트는 "헤딩 + 본문"이라 결과 미리보기에서는 헤딩을 한 번 뺀다. */
function snippet(text: string, heading: string): string {
  return text.startsWith(heading) ? text.slice(heading.length).replace(/^[\s\-·:]+/, '') : text;
}

export function Search() {
  const navigate = useNavigate();
  const { index, searchDocs: loadDocs, aggregates, online } = useStore();
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get('q') ?? '');
  const [query, setQuery] = useState(input);
  const key = index.status === 'ready' ? index.data.generatedAt : 'pending';
  // index를 받은 뒤에 검색 파일을 불러온다(그 전에는 로딩 상태 유지).
  const docs = useLoad(() => (index.status === 'ready' ? loadDocs() : new Promise<never>(() => {})), key);
  const agg = useLoad(aggregates, key);

  // 입력 후 200ms 뒤에 검색(Eng Review P1)
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(input);
      setParams(input ? { q: input } : {}, { replace: true });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input, setParams]);

  const results = useMemo(() => (docs.status === 'ready' ? searchDocs(docs.data, query) : []), [docs, query]);
  const terms = searchTerms(query);
  const labels = useMemo(() => {
    const m = new Map<string, string>();
    if (index.status === 'ready') for (const d of index.data.days) for (const c of d.categories) m.set(c.slug, c.label);
    return m;
  }, [index]);
  const recentTickers = agg.status === 'ready' ? agg.data.tickers.slice(0, 8) : [];

  const chips = recentTickers.length > 0 && (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 12 }}>
      {recentTickers.map((t) => (
        <Chip key={t.key} size="small" variant="outlined" sx={CHIP_HIT} onClick={() => setInput(t.name)}>
          {t.name}
        </Chip>
      ))}
    </Box>
  );

  return (
    <Page
      title="검색"
      search={false}
      leading={
        <TopNavigationButton variant="icon" sx={TOUCH_44} aria-label="뒤로" onClick={() => navigate(-1)}>
          <IconArrowLeft />
        </TopNavigationButton>
      }
      toolbar={
        <Box sx={{ padding: '8px 16px 12px' }}>
          <SearchField
            autoFocus
            enterKeyHint="search"
            placeholder="종목, 키워드로 찾기"
            aria-label="브리핑 검색"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onReset={() => setInput('')}
          />
        </Box>
      }
    >
      {docs.status === 'loading' && (
        <Box sx={{ paddingTop: 20 }}>
          <Caption>기록 불러오는 중…</Caption>
        </Box>
      )}
      {docs.status === 'error' &&
        (online ? (
          <ErrorView title="검색 기록을 불러오지 못했어요" description="잠시 후 다시 시도해 주세요" onRetry={docs.retry} />
        ) : (
          <ErrorView description="연결되면 검색할 수 있어요" />
        ))}
      {docs.status === 'ready' && !terms.length && (
        <Box sx={{ paddingTop: 20 }}>
          <Caption>최근 자주 나온 종목</Caption>
          {chips}
        </Box>
      )}
      {docs.status === 'ready' && terms.length > 0 && results.length === 0 && (
        <Box sx={{ paddingTop: 32 }}>
          <Typography as="p" variant="body1" weight="bold" sx={{ display: 'block' }}>
            “{query.trim()}” 검색 결과가 없어요
          </Typography>
          <Caption>다른 단어로 찾아보세요</Caption>
          {chips}
        </Box>
      )}
      {results.length > 0 && (
        <>
          <Box sx={{ paddingTop: 12 }}>
            <Caption>
              {results.length >= 100 ? '최근 100개' : `${results.length}개`} 결과
            </Caption>
          </Box>
          <Box as="ul" sx={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {results.map((r) => (
              <ListCell
                key={r.id}
                as="li"
                divider
                fillWidth
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/day/${r.date}/${r.slug}#${sectionId(r.heading)}`)}
                onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && navigate(`/day/${r.date}/${r.slug}#${sectionId(r.heading)}`)}
                sx={{ cursor: 'pointer' }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CategoryDot slug={r.slug} />
                    <Caption>
                      {shortDate(r.date)} · {labels.get(r.slug) ?? r.slug}
                    </Caption>
                  </Box>
                  <Typography variant="label1" weight="bold" noWrap>
                    {r.heading}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="semantic.label.alternative"
                    sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {highlightSegments(snippet(r.text, r.heading), terms).map((s, i) =>
                      s.match ? (
                        <Box as="mark" key={i} sx={(t) => ({ background: 'transparent', color: t.semantic.primary.normal, fontWeight: 700 })}>
                          {s.text}
                        </Box>
                      ) : (
                        <span key={i}>{s.text}</span>
                      ),
                    )}
                  </Typography>
                </Box>
              </ListCell>
            ))}
          </Box>
        </>
      )}
    </Page>
  );
}
