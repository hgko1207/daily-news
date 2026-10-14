// 접근성·반응형 회귀 확인. 브라우저에서 앱 화면을 연 채로 콘솔에 붙여 넣어 돌린다(빌드 도구·테스트 러너 밖).
// 기술 감사(docs/technical-audit-2026-10-09.md)에서 회귀를 잡은 측정을 한 파일로 모았다. 사용법은 docs/test-plan-mobile-pwa.md.
//
// 확인하는 것
// - 대비: 화면에 그려진 모든 글자(글자색을 실제 배경 위에 합성해 WCAG 공식으로). 4.5:1(큰 글자 3:1) 미만
// - 영어 접근성 라벨: aria-label이 영어로만 된 요소(Montage 기본 라벨이 새로 생겼는지)
// - 화면 제목: 1단계 제목(h1 또는 aria-level=1)이 있는지
// - 가로 넘침: 페이지가 옆으로 밀리는지
// - 줄바꿈: 한글 단어 가운데서 줄이 바뀌는 곳(양쪽이 모두 한글일 때만. URL·코드처럼 공백 없이 긴 문자열은 제외)
// - 눌리는 영역: 버튼·링크 가운데에서 상하좌우 21px(44px 영역의 끝)을 실제로 찍어 그 요소가 잡히는지.
//   본문 안의 글 속 링크는 WCAG 2.5.8 예외라 뺀다. 상자 크기가 아니라 실제 눌림을 본다(overflow로 잘린 영역을 잡으려고)
//
// 글자 확대는 먼저 document.documentElement.style.fontSize = '200%' 를 실행한 뒤 돌린다.
// 끝에 세미콜론을 두지 않는다: gstack browse eval은 파일을 괄호로 감싼 식으로 실행한다.
(async () => {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p[3] ?? 1];
  };
  const lin = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const bgOf = (el) => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c && c[3] > 0) {
        layers.push(c);
        if (c[3] >= 1) break;
      }
    }
    let base = (parse(getComputedStyle(document.body).backgroundColor) ?? [255, 255, 255]).slice(0, 3);
    for (const c of layers.reverse()) base = base.map((v, i) => v * (1 - c[3]) + c[i] * c[3]);
    return base;
  };
  const name = (el) => (el.getAttribute('aria-label') || el.textContent || el.labels?.[0]?.textContent || el.getAttribute('role') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 16);
  const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';

  // 대비
  const lowContrast = new Map();
  for (const el of document.querySelectorAll('body *')) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
    if (!own || !visible(el) || el.closest(':disabled,[aria-disabled="true"],[aria-hidden="true"]')) continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    if (!fg) continue;
    const bg = bgOf(el);
    const mixed = fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
    const [a, b] = [lum(mixed), lum(bg)];
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const size = parseFloat(cs.fontSize);
    const need = size >= 24 || (+cs.fontWeight >= 700 && size >= 18.66) ? 3 : 4.5;
    if (ratio < need) lowContrast.set(`${ratio.toFixed(2)}:1 ${size}px "${own.slice(0, 12)}"`, el);
  }

  // 영어 라벨, 화면 제목, 가로 넘침
  const english = [...new Set([...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')).filter((t) => /^[A-Za-z ]+$/.test(t)))];
  const h1 = document.querySelector('h1, [aria-level="1"]');
  const overflowX = document.documentElement.scrollWidth - innerWidth;

  // 한글 단어 가운데 줄바꿈
  const midWord = new Set();
  const range = document.createRange();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent;
    const el = n.parentElement;
    if (!/[가-힣].*[가-힣]/.test(t) || !el || !visible(el) || el.closest('[aria-hidden="true"],script,style')) continue;
    let prevTop = null;
    for (let i = 0; i < t.length; i++) {
      if (/\s/.test(t[i])) continue;
      range.setStart(n, i);
      range.setEnd(n, i + 1);
      const r = range.getClientRects()[0];
      if (!r) continue;
      if (prevTop !== null && r.top > prevTop + 2 && /[가-힣]/.test(t[i - 1] ?? '') && /[가-힣]/.test(t[i])) {
        midWord.add(`"${t.slice(Math.max(0, i - 6), i)}|${t.slice(i, i + 4)}" (${el.tagName.toLowerCase()}, word-break: ${getComputedStyle(el).wordBreak})`);
        break;
      }
      prevTop = r.top;
    }
  }

  // 눌리는 영역(실제 눌림)
  const scrollY0 = scrollY;
  const targets = [...document.querySelectorAll('a[href], button:not(:disabled), [role=tab], [role=radio], [role=checkbox], input')].filter(
    (e) => visible(e) && !e.closest('[aria-hidden="true"]') && !e.closest('article p, article li, article td'),
  );
  const smallTargets = new Map();
  for (const el of targets) {
    // scrollIntoView는 바로 레이아웃을 바꾸고 아래 측정도 동기라 기다릴 필요가 없다(await를 넣으면 browse eval에서 결과가 비었다)
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
    const r = el.getBoundingClientRect();
    if (!r.width) continue;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    // 기준은 "44px 영역": 가운데에서 21px까지 찍는다. 더 큰 요소의 가장자리(스크롤바 등이 덮는 1~2px)는 보지 않는다
    const dx = 21;
    const dy = 21;
    const hits = (x, y) => {
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return true; // 화면 밖은 판단하지 않는다
      const h = document.elementFromPoint(x, y);
      const label = h?.closest('label');
      // 연결된 label(체크박스 옆 문장 등)이나 입력칸을 감싼 틀(누르면 입력칸이 선택됨)을 눌러도 같은 대상으로 본다
      const field = el.tagName === 'INPUT' && h?.closest('[wds-component$="field"]');
      return !!h && (h === el || el.contains(h) || !!(field && field.contains(el)) || !!(label && (label.contains(el) || (el.id && label.htmlFor === el.id))));
    };
    const missed = [['위', cx, cy - dy], ['아래', cx, cy + dy], ['왼', cx - dx, cy], ['오른', cx + dx, cy]].filter(([, x, y]) => !hits(x, y)).map((p) => p[0]);
    if (missed.length) {
      // 같은 모양(크기·빗나간 방향)은 한 줄로 묶는다. 예: 모아보기 체크박스 83개
      const key = `${Math.round(r.width)}×${Math.round(r.height)} [${missed.join(',')}]`;
      const cur = smallTargets.get(key);
      smallTargets.set(key, { sample: cur?.sample ?? name(el), count: (cur?.count ?? 0) + 1 });
    }
  }
  scrollTo(0, scrollY0);

  const lines = [
    `화면 ${location.hash || '#/'} · 폭 ${innerWidth}px · 글자 ${getComputedStyle(document.documentElement).fontSize} · 테마 ${document.documentElement.dataset.theme ?? '-'}`,
    `${lowContrast.size ? '✗' : '✓'} 대비 미달 ${lowContrast.size}`,
    ...[...lowContrast.keys()].slice(0, 8).map((k) => `    ${k}`),
    `${english.length ? '✗' : '✓'} 영어 라벨 ${english.length}${english.length ? ': ' + english.join(', ') : ''}`,
    `${h1 ? '✓' : '✗'} 1단계 제목 ${h1 ? `"${name(h1)}"` : '없음'}`,
    `${overflowX > 0 ? '✗' : '✓'} 가로 넘침 ${overflowX}px`,
    `${midWord.size ? '✗' : '✓'} 한글 단어 가운데 줄바꿈 ${midWord.size}`,
    ...[...midWord].slice(0, 8).map((k) => `    ${k}`),
    `${smallTargets.size ? '✗' : '✓'} 눌리는 영역 44px 미만 ${[...smallTargets.values()].reduce((s, v) => s + v.count, 0)} / 버튼·링크 ${targets.length}개`,
    ...[...smallTargets].slice(0, 10).map(([k, v]) => `    ${v.sample} ${k}${v.count > 1 ? ` ×${v.count}` : ''}`),
  ];
  const report = lines.join('\n');
  console.log(report);
  return report;
})()
