import { Box, Divider, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, Typography } from '@wanteddev/wds';
import { Children, isValidElement, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { stripLeadingEmoji } from '../scripts/parse.ts';
import { RightFade, SCROLL_MARGIN, SERIF_TYPE, useMoreToRight } from './layout.tsx';
import { sectionId } from './section.ts';

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
  // 왼쪽 굵은 세로선 대신 옅은 면으로 구분한다(.impeccable.md 금지 패턴). 투자 면책 문구 등.
  blockquote: ({ children }) => (
    <Box
      as="blockquote"
      sx={(t) => ({
        margin: '0 0 16px',
        padding: '12px 16px',
        borderRadius: 8,
        background: t.semantic.fill.alternative,
        '& p:last-child': { marginBottom: 0 },
      })}
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
  const [ref, more] = useMoreToRight<HTMLDivElement>((node) => node.querySelector('[data-radix-scroll-area-viewport]'));
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
      {more && <RightFade inset={1} radius={12} />}
    </Box>
  );
}

// 말씀 본문 인용은 오늘 탭과 같은 세리프로, 면 없이 괘선 사이에 둔다.
const wordComponents: Components = {
  ...components,
  blockquote: ({ children }) => (
    <Box
      as="blockquote"
      sx={(t) => ({
        margin: '4px 0 16px',
        padding: '16px 0',
        borderTop: `1px solid ${t.semantic.line.normal.normal}`,
        borderBottom: `1px solid ${t.semantic.line.normal.normal}`,
        '& p': SERIF_TYPE.word,
        '& p:last-child': { marginBottom: 0 },
      })}
    >
      {children}
    </Box>
  ),
};

export function Markdown({ source, slug }: { source: string; slug?: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={slug === 'word' ? wordComponents : components}>
      {source}
    </ReactMarkdown>
  );
}
