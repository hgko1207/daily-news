// 브리핑 마크다운 → 구조화 데이터. 파일 입출력 없는 순수 함수만 둔다.
// 원칙: 원문(markdown)은 항상 보존하고, 구조 추출은 실패해도 빈 값으로 넘어간다.

export type CategorySlug = 'economy' | 'global' | 'dev' | 'life' | 'invest' | 'word';

export interface Category {
  folder: string;
  slug: CategorySlug | string;
  label: string;
}

export const CATEGORIES: Category[] = [
  { folder: '01_국내경제', slug: 'economy', label: '국내·경제' },
  { folder: '02_글로벌기술', slug: 'global', label: '글로벌 기술' },
  { folder: '03_개발자', slug: 'dev', label: '개발자' },
  { folder: '04_교양생활', slug: 'life', label: '교양·생활' },
  { folder: '05_투자', slug: 'invest', label: '투자' },
  { folder: '06_말씀', slug: 'word', label: '오늘의 말씀' },
];

/** 매핑에 없는 폴더는 폴더명을 그대로 slug·라벨로 쓴다. */
export function categoryForFolder(folder: string): { category: Category; known: boolean } {
  const found = CATEGORIES.find((c) => c.folder === folder);
  if (found) return { category: found, known: true };
  const label = folder.replace(/^\d+_/, '');
  return { category: { folder, slug: folder, label }, known: false };
}

// ── 텍스트 정리 ────────────────────────────────────────────

const LEADING_EMOJI = /^[\p{Extended_Pictographic}\p{Regional_Indicator}‍️\s]+/u;

/** 헤딩 앞자리 이모지만 제거한다(D10). 본문 중간 이모지는 건드리지 않는다. */
export function stripLeadingEmoji(text: string): string {
  return text.replace(LEADING_EMOJI, '').trim();
}

/** 마크다운 인라인 문법을 걷어내 평문으로 만든다. */
export function toPlain(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*|__/g, '')
    .replace(/(^|\s)[*_](\S[^*_]*\S|\S)[*_](?=\s|$)/g, '$1$2')
    .replace(/^>\s?/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 문장 단위로 나눈다. 마침표·물음표·느낌표 뒤 공백 기준. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// ── 섹션 분해 ──────────────────────────────────────────────

export interface Section {
  level: 2 | 3;
  /** 원문 헤딩(이모지 포함) */
  rawHeading: string;
  /** 앞자리 이모지를 뺀 헤딩 */
  heading: string;
  /** 헤딩 다음 줄부터 다음 같은/상위 헤딩 전까지의 원문 */
  body: string;
}

export function splitSections(markdown: string): Section[] {
  const lines = markdown.split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section | null = null;
  const buf: string[] = [];
  const flush = () => {
    if (current) {
      current.body = buf.join('\n').trim();
      sections.push(current);
    }
    buf.length = 0;
  };
  for (const line of lines) {
    const m = /^(#{2,3})\s+(.*)$/.exec(line);
    if (m) {
      flush();
      const raw = m[2]!.trim();
      // 화면 헤딩 id(평문)와 맞추려고 마크다운 문법을 걷어낸다(Design Audit F1).
      current = { level: m[1]!.length as 2 | 3, rawHeading: raw, heading: stripLeadingEmoji(toPlain(raw)), body: '' };
    } else if (current) {
      buf.push(line);
    }
  }
  flush();
  return sections;
}

export function extractTitle(markdown: string): string {
  const m = /^#\s+(.+)$/m.exec(markdown);
  return m ? stripLeadingEmoji(m[1]!.trim()) : '';
}

// ── 핵심(🔎) ───────────────────────────────────────────────

function bulletsOf(body: string): string[] {
  return body
    .split(/\r?\n/)
    .filter((l) => /^\s*[-*]\s+/.test(l))
    .map((l) => toPlain(l.replace(/^\s*[-*]\s+/, '')))
    .filter(Boolean);
}

/** 🔎 핵심 섹션의 문장들. 섹션이 없으면 첫 섹션 첫 문장으로 대체한다. */
export function extractHighlights(markdown: string): { highlights: string[]; fallback: boolean } {
  const sections = splitSections(markdown);
  const core = sections.find((s) => s.level === 2 && /^🔎/u.test(s.rawHeading));
  if (core) {
    const body = core.body.split(/^---\s*$/m)[0] ?? '';
    const bullets = bulletsOf(body);
    if (bullets.length) return { highlights: bullets, fallback: false };
    const sentences = splitSentences(toPlain(body));
    if (sentences.length) return { highlights: sentences, fallback: false };
  }
  const first = sections.find((s) => s.body.trim());
  if (!first) return { highlights: [], fallback: true };
  const firstParagraph = first.body.split(/\n\s*\n/)[0] ?? '';
  const sentence = splitSentences(toPlain(firstParagraph))[0];
  return { highlights: sentence ? [sentence] : [], fallback: true };
}

// ── ✅ 액션 ────────────────────────────────────────────────

export interface Action {
  id: string;
  date: string;
  slug: string;
  text: string;
}

/** ✅가 들어간 불릿 줄, 그리고 ✅ 헤딩 아래의 불릿 줄만 액션으로 본다. 헤딩 줄 자체는 제외. */
export function extractActions(markdown: string, date: string, slug: string): Action[] {
  const texts: string[] = [];
  for (const s of splitSections(markdown)) {
    const underActionHeading = s.rawHeading.includes('✅');
    for (const line of s.body.split(/\r?\n/)) {
      if (!/^\s*[-*]\s+/.test(line)) continue;
      if (!underActionHeading && !line.includes('✅')) continue;
      const text = toPlain(
        line
          .replace(/^\s*[-*]\s+/, '')
          // 마크다운 체크박스("- [ ] …")는 앱 체크박스와 겹치므로 뗀다(Design Audit F3)
          .replace(/^\[[ xX]\]\s*/, '')
          .replace(/✅\s*/g, '')
          .replace(/^\*\*액션:?\*\*:?\s*/, ''),
      );
      if (text) texts.push(text);
    }
  }
  return texts.map((text) => ({ id: `${date}-${slug}-${hash(text)}`, date, slug, text }));
}

// ── ⭐ 관심 종목 ────────────────────────────────────────────

export interface TickerMention {
  name: string;
  code?: string;
  text: string;
}

const LABEL_WORDS = /^(체크포인트|촉매|요약|의미|생각해볼 점|액션|참고|국내|미국|종목)$/;
const TICKER_LINE = /^(?:[-*]\s+)?\*\*\[?([^*\]\n]+?)\]?\s*:?\*\*\s*:?\s*(?:[—–-]\s*)?(.*)$/;

const MAX_TICKER_NAME = 12;

/**
 * "스페이스X (비상장 → 상장)", "SpaceX(SPCX, 6월 상장)" 같은 표기를 이름 + 코드로 정리한다.
 * 괄호 안 메모는 버리고, 괄호 안에 6자리 숫자나 대문자 티커가 있으면 코드로 쓴다.
 * 여러 종목을 묶은 줄("A / B")이나 종목명이 아닌 문장은 버린다.
 */
export function normalizeTicker(raw: string, rawCode?: string): { name: string; code?: string } | null {
  const text = stripLeadingEmoji(toPlain(raw)).replace(/^\[|\]$/g, '');
  if (!text || text.includes('/')) return null;
  const paren = /\(([^)]*)\)/.exec(text);
  const name = text.replace(/\s*\(.*$/, '').trim();
  if (!name || name.length > MAX_TICKER_NAME || LABEL_WORDS.test(name)) return null;
  if (/\d+\s*월|\d+\s*\/\s*\d+|종가/.test(name)) return null;
  const code = rawCode ?? (paren ? /\b(\d{6}|[A-Z]{2,5})\b/.exec(paren[1]!)?.[1] : undefined);
  return code ? { name, code } : { name };
}

function parseNameCode(cell: string): { name: string; code?: string } | null {
  return normalizeTicker(cell);
}

/** `^##\s*⭐` 헤딩 아래 블록에서만 종목을 읽는다(실측 헤딩 변형 10종). */
export function extractTickers(markdown: string): TickerMention[] {
  const lines = markdown.split(/\r?\n/);
  const mentions: TickerMention[] = [];
  let inBlock = false;
  let tableHeaderSeen = false;
  for (const line of lines) {
    if (/^##\s/.test(line)) {
      inBlock = /^##\s*⭐/u.test(line);
      tableHeaderSeen = false;
      continue;
    }
    if (!inBlock) continue;
    if (/^\|/.test(line)) {
      if (/^\|\s*:?-{2,}/.test(line)) continue;
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      if (!tableHeaderSeen) {
        tableHeaderSeen = true;
        continue;
      }
      const nc = cells[0] ? parseNameCode(cells[0]) : null;
      if (nc) mentions.push({ ...nc, text: toPlain(cells.slice(1).join(' · ')) });
      continue;
    }
    tableHeaderSeen = false;
    const m = TICKER_LINE.exec(line.trim());
    if (!m) continue;
    const nc = normalizeTicker(m[1]!);
    if (!nc) continue;
    mentions.push({ ...nc, text: toPlain(m[2] ?? '') });
  }
  return mentions;
}

// ── 🗓 일정 ────────────────────────────────────────────────

export interface EventRow {
  /** YYYY-MM-DD, 날짜를 못 읽으면 null */
  date: string | null;
  label: string;
  sourceDate: string;
}

/** 일정 표기의 연도를 정한다. 원본 날짜보다 6개월 이상 앞선 달이면 다음 해로 본다. */
export function resolveEventDate(raw: string, sourceDate: string): string | null {
  const text = toPlain(raw);
  const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const md = /(\d{1,2})\s*\/\s*(\d{1,2})/.exec(text) ?? /(\d{1,2})월\s*(\d{1,2})일/.exec(text);
  if (!md) return null;
  const month = Number(md[1]);
  const day = Number(md[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const srcYear = Number(sourceDate.slice(0, 4));
  const srcMonth = Number(sourceDate.slice(5, 7));
  const year = srcMonth - month >= 6 ? srcYear + 1 : srcYear;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** `^##\s*🗓` 헤딩 아래 표. 날짜 열은 헤더 이름으로 찾고, 없으면 셀에서 날짜를 찾는다. */
export function extractEvents(markdown: string, sourceDate: string): EventRow[] {
  const section = splitSections(markdown).find((s) => s.level === 2 && /^🗓/u.test(s.rawHeading));
  if (!section) return [];
  const rows = section.body
    .split(/\r?\n/)
    .filter((l) => /^\|/.test(l) && !/^\|\s*:?-{2,}/.test(l))
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));
  if (rows.length < 2) return [];
  const header = rows[0]!.map(toPlain);
  const dateCol = header.findIndex((h) => /날짜|일자|일시|시점/.test(h));
  const labelCol = header.findIndex((h, i) => i !== dateCol && /이벤트|일정|항목/.test(h));
  const events: EventRow[] = [];
  for (const cells of rows.slice(1)) {
    const labelCell = cells[labelCol >= 0 ? labelCol : dateCol === 0 ? 1 : 0] ?? '';
    const label = toPlain(labelCell);
    if (!label) continue;
    const dateCell = dateCol >= 0 ? (cells[dateCol] ?? '') : cells.join(' ');
    events.push({ date: resolveEventDate(dateCell, sourceDate), label, sourceDate });
  }
  return events;
}

// ── 검색 문서 ──────────────────────────────────────────────

export interface SearchDoc {
  id: string;
  date: string;
  slug: string;
  heading: string;
  text: string;
}

const SEARCH_TEXT_MAX = 200;

export function buildSearchDocs(markdown: string, date: string, slug: string): SearchDoc[] {
  return splitSections(markdown).map((s, i) => ({
    id: `${date}-${slug}-${i}`,
    date,
    slug,
    heading: s.heading,
    text: `${s.heading} ${toPlain(s.body)}`.slice(0, SEARCH_TEXT_MAX),
  }));
}

// ── 한 파일 ────────────────────────────────────────────────

export interface Entry {
  date: string;
  slug: string;
  label: string;
  title: string;
  highlights: string[];
  highlightFallback: boolean;
  /** 섹션 바로가기 칩용(D9): `##` 헤딩 목록 */
  outline: string[];
  markdown: string;
}

export function parseEntry(markdown: string, date: string, category: Category): Entry {
  const { highlights, fallback } = extractHighlights(markdown);
  return {
    date,
    slug: category.slug,
    label: category.label,
    title: extractTitle(markdown),
    highlights,
    highlightFallback: fallback,
    outline: splitSections(markdown)
      .filter((s) => s.level === 2 && !/^🔎/u.test(s.rawHeading))
      .map((s) => s.heading),
    markdown,
  };
}

// ── 헤드라인(D15) ──────────────────────────────────────────

const HEADLINE_ORDER = ['economy', 'global', 'invest', 'dev'];

export interface Headline {
  slug: string;
  text: string;
}

/** 국내·경제 핵심 첫 문장, 없으면 글로벌 → 투자 → 개발자 순. */
export function pickHeadline(entries: Entry[]): Headline | null {
  for (const slug of HEADLINE_ORDER) {
    const e = entries.find((x) => x.slug === slug);
    const text = e?.highlights[0];
    if (e && text) return { slug, text };
  }
  return null;
}

/** 오늘 탭 리스트의 한 줄. 헤드라인으로 쓴 카테고리는 두 번째 문장(없으면 첫 섹션 제목). */
export function listSummary(entry: Entry, headline: Headline | null): string {
  if (headline && headline.slug === entry.slug) {
    return entry.highlights[1] ?? entry.outline[0] ?? entry.highlights[0] ?? '';
  }
  return entry.highlights[0] ?? entry.outline[0] ?? '';
}
