import type { Theme } from '@wanteddev/wds';

// Design Review D12: 카테고리 색 점은 accent.foreground 토큰, 말씀은 색 점 없음.
const DOT: Record<string, keyof Theme['semantic']['accent']['foreground'] | null> = {
  economy: 'lightBlue',
  global: 'violet',
  dev: 'cyan',
  life: 'green',
  invest: 'redOrange',
  word: null,
};

export function dotColor(theme: Theme, slug: string): string | null {
  const key = DOT[slug];
  return key ? theme.semantic.accent.foreground[key] : null;
}
