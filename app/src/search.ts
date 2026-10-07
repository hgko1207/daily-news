import type { SearchDoc } from './types.ts';

export const SEARCH_LIMIT = 100;

/** 공백으로 나눈 검색어. 대소문자는 무시한다. */
export function searchTerms(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * 부분문자열 AND 검색(Eng Review D3). 한국어 조사가 붙은 단어("삼성전자는")나
 * 단어 중간("전자")도 찾는다. docs는 이미 최신순이므로 순서를 유지한다.
 */
export function searchDocs(docs: SearchDoc[], query: string, limit = SEARCH_LIMIT): SearchDoc[] {
  const terms = searchTerms(query);
  if (!terms.length) return [];
  const result: SearchDoc[] = [];
  for (const doc of docs) {
    const text = doc.text.toLowerCase();
    if (terms.every((t) => text.includes(t))) {
      result.push(doc);
      if (result.length >= limit) break;
    }
  }
  return result;
}

/** 결과 스니펫에서 검색어를 강조하기 위해 텍스트를 조각낸다. */
export function highlightSegments(text: string, terms: string[]): { text: string; match: boolean }[] {
  if (!terms.length) return [{ text, match: false }];
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'gi');
  return text
    .split(re)
    .filter(Boolean)
    .map((part) => ({ text: part, match: terms.includes(part.toLowerCase()) }));
}
