// 섹션 id 규칙. 검색 화면도 쓰므로 마크다운 렌더러(react-markdown)와 따로 둔다.
// markdown.tsx에 있으면 검색 화면 코드에 렌더러 전체가 딸려 간다(Technical Audit P2).

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
