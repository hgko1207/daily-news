import { Box, Divider, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, Typography } from '@wanteddev/wds';
import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { stripLeadingEmoji } from '../scripts/parse.ts';
import { SCROLL_MARGIN } from './layout.tsx';

/**
 * 섹션 바로가기(D9)·검색 결과 이동과 헤딩 id가 같은 규칙을 쓰도록 한 곳에서 만든다.
 * id는 원문 그대로 둔다. URL 해시는 브라우저가 인코딩하므로 읽는 쪽에서 디코딩해 비교한다(F1).
 */
export function sectionId(heading: string): string {
  return `sec-${heading.trim().replace(/\s+/g, '-')}`;
}

/** URL 해시(#sec-…)에서 섹션 id를 꺼낸다. 잘못된 인코딩이면 원문을 그대로 쓴다. */
export function idFromHash(hash: string): string {
  const raw = hash.replace(/^#/, '');
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

/** 헤딩 첫 텍스트 조각의 앞자리 이모지만 뗀다(D10). */
function stripFirst(children: ReactNode): ReactNode {
  const arr = Children.toArray(children);
  const [first, ...rest] = arr;
  if (typeof first === 'string') return [stripLeadingEmoji(first), ...rest];
  return arr;
}

// 문서 제목은 h2부터 시작해 앱 제목(h1) 아래로 한 단계 내린다(D14).
const components: Components = {
  h1: ({ children }) => (
    <Typography as="h2" variant="heading1" weight="bold" color="semantic.label.normal" sx={{ display: 'block', margin: '28px 0 12px' }}>
      {stripFirst(children)}
    </Typography>
  ),
  h2: ({ children }) => {
    const text = stripLeadingEmoji(textOf(children));
    return (
      <Typography
        as="h3"
        id={sectionId(text)}
        variant="heading2"
        weight="bold"
        color="semantic.label.normal"
        sx={{ display: 'block', margin: '32px 0 10px', scrollMarginTop: SCROLL_MARGIN }}
      >
        {stripFirst(children)}
      </Typography>
    );
  },
  // ### 헤딩도 검색 결과 단위라 id가 필요하다(F1).
  h3: ({ children }) => (
    <Typography
      as="h4"
      id={sectionId(stripLeadingEmoji(textOf(children)))}
      variant="headline1"
      weight="bold"
      color="semantic.label.normal"
      sx={{ display: 'block', margin: '24px 0 8px', scrollMarginTop: SCROLL_MARGIN }}
    >
      {stripFirst(children)}
    </Typography>
  ),
  p: ({ children }) => (
    <Typography as="p" variant="body1-reading" color="semantic.label.normal" sx={{ display: 'block', margin: '0 0 12px' }}>
      {children}
    </Typography>
  ),
  // Montage reset이 list-style을 지우므로 기호를 다시 지정한다.
  ul: ({ children }) => <Box as="ul" sx={{ margin: '0 0 12px', paddingLeft: 20, listStyle: 'disc' }}>{children}</Box>,
  ol: ({ children }) => <Box as="ol" sx={{ margin: '0 0 12px', paddingLeft: 20, listStyle: 'decimal' }}>{children}</Box>,
  li: ({ children }) => (
    <Typography as="li" variant="body1-reading" color="semantic.label.normal" sx={{ display: 'list-item', marginBottom: 6 }}>
      {children}
    </Typography>
  ),
  a: ({ href, children }) => (
    <Box
      as="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      sx={(t) => ({
        color: t.semantic.primary.normal,
        textDecoration: 'underline',
        textUnderlineOffset: 3,
        '&:visited': { color: t.semantic.primary.heavy },
        wordBreak: 'break-all',
      })}
    >
      {children}
    </Box>
  ),
  blockquote: ({ children }) => (
    <Box
      as="blockquote"
      sx={(t) => ({ margin: '0 0 16px', padding: '4px 0 4px 16px', borderLeft: `3px solid ${t.semantic.line.solid.normal}` })}
    >
      {children}
    </Box>
  ),
  hr: () => <Divider sx={{ margin: '24px 0' }} />,
  strong: ({ children }) => (
    <Box as="strong" sx={{ fontWeight: 700 }}>
      {children}
    </Box>
  ),
  code: ({ children }) => (
    <Box as="code" sx={(t) => ({ fontSize: '0.9em', padding: '1px 4px', borderRadius: 4, background: t.semantic.fill.normal })}>
      {children}
    </Box>
  ),
  // 표: 가로 스크롤, 첫 열 고정, 표 안에서는 카테고리 스와이프 비활성(D8)
  table: ({ children }) => <TableScroll>{children}</TableScroll>,
  thead: ({ children }) => <TableHead>{children}</TableHead>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children }) => (
    <TableHeadCell variant="label2" sx={{ whiteSpace: 'nowrap' }}>
      {children}
    </TableHeadCell>
  ),
  td: ({ children }) => (
    <TableCell variant="body2" sx={{ minWidth: 96 }}>
      {children}
    </TableCell>
  ),
  img: () => null,
};

/**
 * 표: 가로 스크롤, 첫 열 고정, 표 안에서는 카테고리 스와이프 비활성(D8).
 * 칸을 억지로 좁히지 않고, 오른쪽에 더 있으면 가장자리를 흐리게 표시한다(Design Audit F11).
 */
function TableScroll({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const vp = ref.current?.querySelector<HTMLElement>("[data-radix-scroll-area-viewport]");
    if (!vp) return;
    const check = () => setMore(vp.scrollLeft + vp.clientWidth < vp.scrollWidth - 4);
    check();
    vp.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(vp);
    return () => {
      vp.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, []);
  return (
    <Box ref={ref} data-no-swipe sx={{ position: "relative", margin: "0 0 16px" }}>
      <Table
        sx={(t) => ({
          "table": { width: "max-content", minWidth: "100%" },
          "td, th": { maxWidth: 240 },
          "th:first-of-type, td:first-of-type": { position: "sticky", left: 0, zIndex: 1, whiteSpace: "nowrap" },
          "td:first-of-type": { background: t.semantic.background.normal.normal },
          // 헤더 행의 반투명 배경을 고정 칸에서도 같게(불투명하게 겹쳐 칠함)
          "th:first-of-type": {
            background: `linear-gradient(${t.semantic.fill.alternative}, ${t.semantic.fill.alternative}) ${t.semantic.background.normal.normal}`,
          },
        })}
      >
        {children}
      </Table>
      {more && (
        <Box
          aria-hidden
          sx={(t) => ({
            position: "absolute",
            top: 1,
            right: 1,
            bottom: 1,
            width: 32,
            pointerEvents: "none",
            borderRadius: "0 12px 12px 0",
            background: `linear-gradient(to right, transparent, ${t.semantic.background.normal.normal})`,
          })}
        />
      )}
    </Box>
  );
}

export function Markdown({ source }: { source: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {source}
    </ReactMarkdown>
  );
}
