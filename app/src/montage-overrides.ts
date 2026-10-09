import type { Theme } from '@wanteddev/wds';
import { metaColor } from './layout.tsx';

// Montage 기본값이 접근성 기준(.impeccable.md 원칙 4·5, WCAG)에 못 미치는 곳의 우회 처리를 모아 둔 파일.
// 비활성 글자 색과 터치 영역은 전역 스타일, 영어 라벨은 한국어로, SectionMessage 제목 역할 제거.
// 화면 제목 단계는 layout.tsx Page, 상세 탭 높이는 Day.tsx, 하단 탭 높이는 layout.tsx에 있다(컴포넌트 props·sx로 처리).

/**
 * Montage 컴포넌트의 "선택 안 됨·비활성" 글자 색 덮어쓰기(Technical Audit 재감사 P1·P2).
 *
 * Montage 기본값은 대비 4.5:1(.impeccable.md 원칙 5)에 못 미친다.
 * 상세 탭 1.68:1, 하단 탭 2.78:1, 세그먼트 3.5:1, 검색창 안내 문구 1.68:1.
 * 앱 보조 글씨와 같은 metaColor(라이트 5.3:1, 다크 4.9:1)로 맞춘다. 그 밖의 Montage 모양은 건드리지 않는다.
 *
 * 선택자 앞의 html은 Montage 클래스 선택자보다 항상 우선하게 하려고 붙였다.
 * Montage 버전을 올리면 아래 wds-component·data-role 이름이 그대로인지 확인한다.
 */
export const montageContrastStyles = (t: Theme) => ({
  // 하단 탭: 선택된 탭은 aria-current="page"(primary), 나머지 아이콘·라벨
  'html [wds-component="bottom-navigation-item"]:not([aria-current="page"])': { color: metaColor(t) },
  // 상세 화면 카테고리 탭: 호버하면 한 단계 진해지는 Montage 동작은 유지한다
  'html [wds-component="tab-list-item"][aria-selected="false"] [data-role="tab-list-item-text"]': { color: metaColor(t) },
  'html [wds-component="tab-list-item"][aria-selected="false"]:hover [data-role="tab-list-item-text"]': {
    color: t.semantic.label.neutral,
  },
  // 세그먼트(모아보기 액션/종목, 설정 화면 모드): 화면 배경보다 밝은 회색 트랙 위라 metaColor로는 다크에서 3.9:1.
  // 선택 항목은 따로 흰 바탕이 있어 구분되므로 한 단계 진한 neutral을 쓴다.
  'html [wds-component="segmented-control-item"][data-active="false"]': { color: t.semantic.label.neutral },
  // 검색창 안내 문구와 돋보기
  'html [wds-component="search-field"] input::placeholder': { color: metaColor(t) },
  'html [wds-component="search-field"] [data-role="search-field-icon"]': { color: metaColor(t) },
});

/**
 * Montage 컴포넌트의 눌리는 영역을 44px로(.impeccable.md 원칙 4, 재감사 P3). 보이는 모양은 그대로 두고 가상 요소로만 넓힌다.
 * 세그먼트는 항목 자체의 ::before·::after를 모양에 쓰므로 안쪽 글자 span에 붙인다(항목이 position: relative).
 */
const segmentedHit = {
  // 항목 28px → 위아래 8px씩. 트랙 안쪽 여백 2px + 툴바 여백 8px 안에 들어간다
  'html [data-role="segmented-control-item-text"]::after': {
    content: '""',
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: -8,
    bottom: -8,
  },
};
const tabHit = {
  // 좁은 탭은 폭 26px("투자"). 탭 사이 간격 24px의 절반씩 좌우로 넓힌다.
  // 높이는 탭 목록의 스크롤 영역이 세로로 넘친 부분을 잘라 여기서 못 넓힌다. Day.tsx에서 탭 여백으로 46px(실효 약 44px)
  'html [wds-component="tab-list-item"]::before': {
    content: '""',
    position: 'absolute' as const,
    left: -12,
    right: -12,
    top: 0,
    bottom: 0,
  },
};
export const montageTouchStyles = { ...segmentedHit, ...tabHit };

/** Montage가 영어로 고정해 둔 접근성 라벨 → 한국어(재감사 P2, WCAG 3.1.2). 정확히 같은 문자열만 바꾼다. */
const KOREAN_LABELS: Record<string, string> = {
  'Close message': '안내 닫기', // SectionMessage 닫기 버튼
  'Close snackbar': '알림 닫기', // Snackbar 닫기 버튼
  Notifications: '알림', // 토스트·스낵바가 뜨는 영역
  info: '안내', // SectionMessage·Toast 아이콘
  positive: '완료',
  negative: '오류',
  cautionary: '주의',
};

/**
 * 화면에 생기는 Montage 요소의 영어 라벨을 한국어로 바꾼다.
 * 토스트·스낵바처럼 나중에 생겼다 사라지는 것도 잡도록 body를 지켜본다. 바꾼 값은 표에 없으므로 다시 바뀌지 않는다.
 */
export function localizeMontageLabels(root: HTMLElement = document.body): () => void {
  const fix = (el: Element) => {
    const ko = KOREAN_LABELS[el.getAttribute('aria-label') ?? ''];
    if (ko) el.setAttribute('aria-label', ko);
  };
  const scan = (node: Element) => {
    fix(node);
    node.querySelectorAll('[aria-label]').forEach(fix);
  };
  scan(root);
  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'attributes') fix(r.target as Element);
      else r.addedNodes.forEach((n) => n instanceof Element && scan(n));
    }
  });
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-label'] });
  return () => observer.disconnect();
}

/**
 * SectionMessage는 안내 문구를 h2로 그려 화면 제목 목록에 섞인다. 안내는 섹션 제목이 아니므로 제목 역할만 뺀다.
 * ref로 넘긴다. 같은 함수라 렌더마다 다시 불리지 않는다.
 */
export function demoteSectionMessageTitle(el: HTMLElement | null) {
  el?.querySelector('[data-role="section-message-content-title"]')?.setAttribute('role', 'none');
}
