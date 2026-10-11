/**
 * 브리핑 원문 문자열을 화면용으로 나눈다(디자인 점검 10/11 6·9번).
 * 원문 형식이 날마다 조금씩 달라서, 규칙에 맞지 않으면 원문을 그대로 돌려준다.
 */

const DATE = String.raw`(?:\d{4}-\d{2}-\d{2}|\d{4}년\s*\d{1,2}월\s*\d{1,2}일)`;
const TITLE_RE = new RegExp(String.raw`^(.*?)\s*[—–]\s*${DATE}\s*(?:\(([^)]*)\))?\s*$`);
const WEEKDAY_RE = /^(?:[월화수목금토일](?:요일)?|주일)\s*(?:,\s*)?/;

/**
 * "국내·경제 브리핑 — 2026-10-09 (금, 한글날)" → { name: "국내·경제 브리핑", note: "한글날" }.
 * 날짜는 헤더(‹ 10/9 ›)에, 요일은 날짜에 있으므로 뗀다. 괄호 속 다른 정보(한글날, 국내 휴장 3일째)는 note로 남긴다.
 */
export function splitTitle(title: string): { name: string; note: string | null } {
  const m = TITLE_RE.exec(title.trim());
  const name = m?.[1]?.trim();
  if (!m || !name) return { name: title.trim(), note: null };
  const note = (m[2] ?? '').trim().replace(WEEKDAY_RE, '').trim();
  return { name, note: note || null };
}

/** 성경 장절: "25:11", "62:5-6", "16장 3절", "37편 5절", "1장 5~6절" */
const VERSE_REF = String.raw`(?:\d+\s*:\s*\d+|\d+\s*[장편]\s*\d+(?:\s*[~\-–]\s*\d+)?\s*절)`;
const DASH_CITATION_RE = new RegExp(String.raw`^(.*\S)\s*[—–]\s*([^—–]*${VERSE_REF}[^—–]*)$`);
const PAREN_CITATION_RE = new RegExp(String.raw`^(.*\S)\s*\(([^()]*${VERSE_REF}[^()]*)\)\s*$`);
const CITATION_LINE_RE = new RegExp(String.raw`^[—–]\s*\S[^—–]*${VERSE_REF}`);

/**
 * "…금 사과니라 — 잠언 25:11 (개역개정)" → { text: "…금 사과니라", cite: "잠언 25:11 (개역개정)" }.
 * "…하지 말라\" (골로새서 3:23, 개역개정)"처럼 괄호로 감싼 출처도 뗀다. 장절이 없으면 cite는 null.
 */
export function splitCitation(summary: string): { text: string; cite: string | null } {
  const s = summary.trim();
  const m = DASH_CITATION_RE.exec(s) ?? PAREN_CITATION_RE.exec(s);
  if (!m) return { text: s, cite: null };
  return { text: m[1]!.trim(), cite: m[2]!.trim() };
}

/** 상세 화면 말씀 인용 안의 출처 줄("— 잠언 25:11 (개역개정)")인지. */
export function isCitationLine(line: string): boolean {
  return CITATION_LINE_RE.test(line.trim());
}
