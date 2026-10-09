import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { aggregateTickers, dedupeEvents, searchFileName } from './build-data.ts';
import {
  categoryForFolder,
  extractActions,
  extractEvents,
  extractHighlights,
  extractTickers,
  listSummary,
  normalizeTicker,
  outlineOf,
  parseEntry,
  pickHeadline,
  resolveEventDate,
  stripLeadingEmoji,
  type Entry,
} from './parse.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('stripLeadingEmoji', () => {
  it.each([
    ['🔎 핵심', '핵심'],
    ['🇰🇷 국내·경제 브리핑', '국내·경제 브리핑'],
    ['👨‍💻 개발자 브리핑', '개발자 브리핑'],
    ['1. 코스피 7,000선 ✅', '1. 코스피 7,000선 ✅'],
  ])('%s → %s', (input, expected) => {
    expect(stripLeadingEmoji(input)).toBe(expected);
  });
});

describe('extractHighlights', () => {
  it('🔎 섹션의 불릿을 쓴다', () => {
    const md = '# t\n\n## 🔎 핵심\n- 첫째 **굵게**.\n- 둘째 [링크](https://x).\n\n---\n\n## 1. 항목\n본문';
    expect(extractHighlights(md)).toEqual({ highlights: ['첫째 굵게.', '둘째 링크.'], fallback: false });
  });

  it('불릿이 없으면 문단을 문장으로 나눈다(7월 초 포맷)', () => {
    const md = '# t\n\n## 🔎 핵심\n첫 문장이다. 둘째 문장이다.\n\n## 1. 항목\n본문';
    expect(extractHighlights(md).highlights).toEqual(['첫 문장이다.', '둘째 문장이다.']);
  });

  it('🔎 섹션이 없으면 첫 섹션 첫 문장으로 대체한다', () => {
    const md = '# t\n\n## 📚 지식 한 조각\n디램은 휘발성이다. 리프레시가 필요하다.\n\n## 💡 팁\n내용';
    expect(extractHighlights(md)).toEqual({ highlights: ['디램은 휘발성이다.'], fallback: true });
  });
});

describe('extractActions', () => {
  it('✅ 불릿과 ✅ 헤딩 아래 불릿만 잡고 헤딩 줄은 제외한다', () => {
    const md = [
      '## 1. 이슈',
      '- **요약:** 요약문',
      '- ✅ **액션:** TSMC 실적 확인',
      '## ✅ 액션 포인트',
      '- 겉옷 챙기기',
      '- 금리 비교 10분',
      '- [ ] 카드 결제 점검',
    ].join('\n');
    const actions = extractActions(md, '2026-10-06', 'life');
    expect(actions.map((a) => a.text)).toEqual(['TSMC 실적 확인', '겉옷 챙기기', '금리 비교 10분', '카드 결제 점검']);
    expect(actions[0]!.id).toMatch(/^2026-10-06-life-/);
  });
});

describe('normalizeTicker / extractTickers', () => {
  it.each([
    ['삼성전자(005930)', { name: '삼성전자', code: '005930' }],
    ['SK하이닉스 (000660)', { name: 'SK하이닉스', code: '000660' }],
    ['SpaceX(SPCX, 6월 상장)', { name: 'SpaceX', code: 'SPCX' }],
    ['스페이스X (비상장 → 상장)', { name: '스페이스X' }],
    ['[엔비디아]', { name: '엔비디아' }],
  ])('%s', (input, expected) => {
    expect(normalizeTicker(input)).toEqual(expected);
  });

  it.each(['SK스퀘어 / 삼성전기 (동반 강세)', '8월 26일(수) 장 마감 후', '체크포인트', '허깅페이스 129억 3,000만 달러 인수 공식 합의'])(
    '종목이 아닌 표기는 버린다: %s',
    (input) => {
      expect(normalizeTicker(input)).toBeNull();
    },
  );

  it('⭐ 블록 안의 세 가지 표기를 모두 읽고 다른 섹션 라벨 불릿은 무시한다', () => {
    const md = [
      '## 🔧 반도체 업황',
      '- **수출:** 603억 달러',
      '## ⭐ 관심 종목 촉매',
      '### 국내',
      '- **삼성전자(005930):** 10/8 잠정실적',
      '**SK하이닉스 (000660)** — 8/19 -9.75%',
      '- **체크포인트**: 외국인 순매수',
      '| 종목 | 촉매 | 체크포인트 |',
      '|---|---|---|',
      '| **엔비디아(NVDA)** | 시총 6조 | TSMC 실적 |',
      '## 📦 ETF 동향',
      '- **QQQ:** 강세',
    ].join('\n');
    expect(extractTickers(md)).toEqual([
      { name: '삼성전자', code: '005930', text: '10/8 잠정실적' },
      { name: 'SK하이닉스', code: '000660', text: '8/19 -9.75%' },
      { name: '엔비디아', code: 'NVDA', text: '시총 6조 · TSMC 실적' },
    ]);
  });
});

describe('aggregateTickers', () => {
  it('코드 없는 언급과 이름·코드가 뒤바뀐 표기를 합치고 최근 언급순으로 정렬한다', () => {
    const result = aggregateTickers([
      { date: '2026-09-01', name: 'TSMC', code: 'TSM', text: 'a' },
      { date: '2026-09-13', name: 'TSM', code: 'TSMC', text: 'b' },
      { date: '2026-10-01', name: '스페이스X', text: 'c' },
      { date: '2026-09-20', name: '스페이스X', code: 'SPCX', text: 'd' },
      { date: '2026-09-21', name: 'SpaceX', code: 'SPCX', text: 'e' },
    ]);
    expect(result.map((t) => [t.key, t.name, t.count, t.lastDate])).toEqual([
      ['SPCX', '스페이스X', 3, '2026-10-01'],
      ['TSM', 'TSMC', 2, '2026-09-13'],
    ]);
  });
});

describe('resolveEventDate', () => {
  it.each([
    ['10/8(목) 새벽 3시', '2026-10-06', '2026-10-08'],
    ['**2026-08-26 (현지)**', '2026-08-20', '2026-08-26'],
    ['10/27~28', '2026-10-06', '2026-10-27'],
    ['1/15', '2026-12-20', '2027-01-15'],
    ['9/30', '2026-10-01', '2026-09-30'],
    ['11월 3일', '2026-10-06', '2026-11-03'],
    ['10월 말', '2026-10-06', null],
  ])('%s (원본 %s) → %s', (raw, src, expected) => {
    expect(resolveEventDate(raw, src)).toBe(expected);
  });
});

describe('extractEvents / dedupeEvents', () => {
  it('헤더 이름으로 날짜·이벤트 열을 찾는다(열 순서 무관)', () => {
    const a = '## 🗓️ 캘린더\n| 날짜(KST) | 이벤트 |\n|---|---|\n| 10/8(목) | 삼성전자 잠정실적 |';
    const b = '## 🗓️ 일정\n| 일정 | 날짜 | 비고 |\n|---|---|---|\n| **FOMC** | **2026-10-28** | 금리 |';
    expect(extractEvents(a, '2026-10-06')).toEqual([{ date: '2026-10-08', label: '삼성전자 잠정실적', sourceDate: '2026-10-06' }]);
    expect(extractEvents(b, '2026-10-06')).toEqual([{ date: '2026-10-28', label: 'FOMC', sourceDate: '2026-10-06' }]);
  });

  it('다가오는 일정은 최신 캘린더 파일 것만, 지난 일정은 날짜별 최신 파일 것만 남긴다', () => {
    const rows = [
      { date: '2026-10-08', label: '삼성 실적(옛 문구)', sourceDate: '2026-10-05' },
      { date: '2026-10-08', label: '삼성전자 3Q 잠정실적', sourceDate: '2026-10-06' },
      { date: '2026-10-01', label: '수출(옛)', sourceDate: '2026-09-28' },
      { date: '2026-10-01', label: '9월 수출', sourceDate: '2026-09-30' },
      { date: null, label: '날짜 미정(옛)', sourceDate: '2026-10-05' },
    ];
    expect(dedupeEvents(rows, '2026-10-06').map((e) => e.label)).toEqual(['9월 수출', '삼성전자 3Q 잠정실적']);
  });
});

describe('pickHeadline / listSummary', () => {
  const entry = (slug: string, highlights: string[], outline: string[] = []): Entry => ({
    date: '2026-07-01',
    slug,
    label: slug,
    title: '',
    highlights,
    highlightFallback: false,
    outline,
    markdown: '',
  });

  it('국내·경제 → 글로벌 → 투자 → 개발자 순으로 고른다', () => {
    expect(pickHeadline([entry('global', ['G1']), entry('economy', ['E1'])])).toEqual({ slug: 'economy', text: 'E1' });
    expect(pickHeadline([entry('dev', ['D1']), entry('invest', ['I1']), entry('economy', [])])).toEqual({ slug: 'invest', text: 'I1' });
    expect(pickHeadline([entry('life', ['L1'])])).toBeNull();
  });

  it('헤드라인으로 쓴 카테고리는 리스트에서 두 번째 문장, 없으면 첫 섹션 제목을 쓴다', () => {
    const headline = { slug: 'economy', text: 'E1' };
    expect(listSummary(entry('economy', ['E1', 'E2']), headline)).toBe('E2');
    expect(listSummary(entry('economy', ['E1'], ['1. 코스피']), headline)).toBe('코스피');
    expect(listSummary(entry('global', ['G1']), headline)).toBe('G1');
  });
});

describe('outlineOf', () => {
  it('## 항목을 쓰고 🔎은 뺀다', () => {
    const md = ['## 🔎 핵심', '문장.', '## 1. 코스피', '### 세부', '## 2. 수출'].join('\n');
    expect(outlineOf(md)).toEqual(['1. 코스피', '2. 수출']);
  });
  it('## 항목이 없으면 ### 항목을 쓴다(2026-10-08 포맷)', () => {
    const md = ['## 🔎 핵심', '문장.', '---', '### 1. 삼성전자 3Q', '- 요약', '### 2. 코스피'].join('\n');
    expect(outlineOf(md)).toEqual(['1. 삼성전자 3Q', '2. 코스피']);
  });
});

describe('실제 저장소 전체 파일', () => {
  const files = readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{2}_/.test(d.name))
    .flatMap((d) =>
      readdirSync(join(ROOT, d.name))
        .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
        .map((f) => ({ folder: d.name, file: f })),
    );

  it('500개 이상 파일을 크래시 없이 파싱하고 모두 제목이 있다', () => {
    expect(files.length).toBeGreaterThan(500);
    for (const { folder, file } of files) {
      const md = readFileSync(join(ROOT, folder, file), 'utf8');
      const entry = parseEntry(md, file.slice(0, 10), categoryForFolder(folder).category);
      expect(entry.title, `${folder}/${file}`).not.toBe('');
    }
  });

  it('말씀을 제외한 파일의 95% 이상에서 🔎 핵심을 직접 추출한다', () => {
    const news = files.filter((f) => !f.folder.endsWith('말씀'));
    const ok = news.filter(({ folder, file }) => !extractHighlights(readFileSync(join(ROOT, folder, file), 'utf8')).fallback);
    expect(ok.length / news.length).toBeGreaterThanOrEqual(0.95);
  });
});

describe('searchFileName (재감사 P2: 월별 + 내용 해시)', () => {
  it('내용이 같으면 이름도 같고, 내용이 바뀌면 이름이 바뀐다', () => {
    const a = searchFileName('2026-09', '[{"id":"x"}]');
    expect(a).toMatch(/^search-2026-09\.[0-9a-f]{8}\.json$/);
    expect(searchFileName('2026-09', '[{"id":"x"}]')).toBe(a);
    expect(searchFileName('2026-09', '[{"id":"y"}]')).not.toBe(a);
  });

  it('서비스 워커 캐시 규칙(vite.config.ts)과 이름 모양이 맞는다', () => {
    expect(`/daily-news/data/${searchFileName('2026-10', '[]')}`).toMatch(/\/data\/search-[\d-]+\.[0-9a-f]{8}\.json$/);
  });
});
