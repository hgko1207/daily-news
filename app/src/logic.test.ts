import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAggregates, fetchDay, fetchIndex, hasNewBriefing, issueNumber, kstNow, todayView } from './data.ts';
import { detectPlatform } from './install.ts';
import { idFromHash, sectionId } from './markdown.tsx';
import { highlightSegments, searchDocs } from './search.ts';
import type { IndexData, SearchDoc } from './types.ts';
import { advice, skyLabel, summarize, type Forecast } from './weather.ts';

const index = (dates: string[]): IndexData => ({
  generatedAt: '2026-10-07T01:10:00Z',
  latestDate: dates[0] ?? null,
  searchFiles: [],
  days: dates.map((date) => ({ date, weekday: '화', headline: null, categories: [] })),
});

// KST = UTC+9
const at = (kst: string) => new Date(`${kst}+09:00`);

describe('kstNow', () => {
  it('기기 시간대와 무관하게 KST 날짜를 쓴다', () => {
    expect(kstNow(new Date('2026-10-06T16:30:00Z'))).toEqual({ date: '2026-10-07', minutes: 90 });
  });
});

describe('todayView (D6)', () => {
  it('오늘 파일이 있으면 오늘을 안내 없이 보여준다', () => {
    expect(todayView(index(['2026-10-07', '2026-10-06']), at('2026-10-07T08:00:00'))).toEqual({
      date: '2026-10-07',
      isToday: true,
      notice: null,
    });
  });

  it('10:30 전에는 최신 브리핑 + 곧 도착', () => {
    expect(todayView(index(['2026-10-06']), at('2026-10-07T08:00:00'))).toEqual({
      date: '2026-10-06',
      isToday: false,
      notice: 'arriving',
    });
  });

  it('10:30 이후에도 없으면 아직 없음', () => {
    expect(todayView(index(['2026-10-06']), at('2026-10-07T10:30:00')).notice).toBe('missing');
  });

  it('데이터가 비어 있으면 날짜 없이 안내도 없다', () => {
    expect(todayView(index([]), at('2026-10-07T08:00:00'))).toEqual({ date: null, isToday: false, notice: null });
  });
});

describe('issueNumber', () => {
  const data = index(['2026-10-08', '2026-10-07', '2026-10-05']);

  it('그날까지 나온 브리핑 수를 호수로 쓴다', () => {
    expect(issueNumber(data, '2026-10-08')).toBe(3);
    expect(issueNumber(data, '2026-10-05')).toBe(1);
  });

  it('브리핑이 없는 날은 호수가 없다', () => {
    expect(issueNumber(data, '2026-10-06')).toBeNull();
  });
});

describe('날씨 요약 (W3)', () => {
  // 10/8 서울 실제 예보 모양(Open-Meteo)
  const hours = (date: string) => Array.from({ length: 24 }, (_, h) => `${date}T${String(h).padStart(2, '0')}:00`);
  const forecast: Forecast = {
    fetchedAt: '2026-10-07T22:50:00Z',
    hourly: {
      time: [...hours('2026-10-08'), ...hours('2026-10-09')],
      temperature_2m: Array.from({ length: 48 }, (_, i) => (i === 8 ? 11.8 : i === 12 ? 20.5 : i === 18 ? 20.5 : i === 32 ? 14.3 : 20)),
      precipitation_probability: Array.from({ length: 48 }, (_, i) => (i === 42 ? 60 : 0)),
      weather_code: Array.from({ length: 48 }, (_, i) => (i === 42 ? 61 : 0)),
    },
    daily: {
      time: ['2026-10-08', '2026-10-09'],
      temperature_2m_max: [22.7, 23.3],
      temperature_2m_min: [10.7, 13.5],
      precipitation_probability_max: [0, 60],
      weather_code: [0, 61],
    },
  };

  it('아침에는 오늘의 출근·점심·퇴근 칸을 만든다', () => {
    const d = summarize(forecast, at('2026-10-08T07:50:00'))!;
    expect(d.tomorrow).toBe(false);
    expect(d.slots.map((s) => [s.label, s.hour, s.temp, s.sky])).toEqual([
      ['출근', 8, 12, '맑음'],
      ['점심', 12, 21, '맑음'],
      ['퇴근', 18, 21, '맑음'],
    ]);
    expect([d.min, d.max, d.rain]).toEqual([11, 23, 0]);
    expect(d.advice).toBe('일교차 12° · 겉옷 챙기세요');
  });

  it('19시부터는 내일 날씨로 넘어간다', () => {
    const d = summarize(forecast, at('2026-10-08T19:00:00'))!;
    expect(d.tomorrow).toBe(true);
    expect(d.date).toBe('2026-10-09');
    expect(d.slots[2]).toMatchObject({ label: '퇴근', sky: '비', rain: 60 });
    expect(d.advice).toBe('우산 챙기세요');
  });

  it('예보에 그날이 없으면 null', () => {
    expect(summarize(forecast, at('2026-10-11T08:00:00'))).toBeNull();
  });

  it('조언은 우산·일교차 조건을 합친다', () => {
    expect(advice(50, 10, 20)).toBe('우산·겉옷 챙기세요');
    expect(advice(49, 10, 19)).toBeNull();
  });

  it('WMO 코드를 짧은 한국어로 바꾼다', () => {
    expect([0, 2, 3, 45, 53, 63, 73, 81, 95].map(skyLabel)).toEqual(['맑음', '구름 조금', '흐림', '안개', '이슬비', '비', '눈', '소나기', '뇌우']);
  });
});

describe('hasNewBriefing', () => {
  it('최신 날짜가 바뀔 때만 참', () => {
    expect(hasNewBriefing(index(['2026-10-06']), index(['2026-10-07', '2026-10-06']))).toBe(true);
    expect(hasNewBriefing(index(['2026-10-07']), { ...index(['2026-10-07']), generatedAt: 'later' })).toBe(false);
    expect(hasNewBriefing(null, index(['2026-10-07']))).toBe(false);
  });
});

describe('fetch 캐시 모드 (Eng Review D4)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('index.json·aggregates.json은 no-cache, 날짜 파일은 기본', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await fetchIndex();
    await fetchAggregates();
    await fetchDay('2026-10-07');
    const calls = fetchMock.mock.calls as unknown as [string, RequestInit | undefined][];
    expect(calls[0]![0]).toMatch(/data\/index\.json$/);
    expect(calls[0]![1]).toEqual({ cache: 'no-cache' });
    expect(calls[1]![1]).toEqual({ cache: 'no-cache' });
    expect(calls[2]![1]).toBeUndefined();
  });

  it('HTTP 오류는 예외로 올린다', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    await expect(fetchDay('2026-01-01')).rejects.toThrow('HTTP 404');
  });
});

describe('searchDocs (Eng Review D3)', () => {
  const doc = (id: string, text: string): SearchDoc => ({ id, date: '2026-10-06', slug: 'invest', heading: '', text });
  const docs = [doc('a', '삼성전자는 10/8 잠정실적을 발표한다'), doc('b', '삼성 HBM4 양산'), doc('c', 'SK하이닉스 HBM 매진')];

  it('조사 붙은 단어와 단어 중간도 찾는다', () => {
    expect(searchDocs(docs, '전자').map((d) => d.id)).toEqual(['a']);
    expect(searchDocs(docs, '삼성전자').map((d) => d.id)).toEqual(['a']);
  });

  it('여러 단어는 모두 포함(AND), 대소문자 무시', () => {
    expect(searchDocs(docs, '삼성 hbm').map((d) => d.id)).toEqual(['b']);
  });

  it('빈 검색어와 결과 0건', () => {
    expect(searchDocs(docs, '   ')).toEqual([]);
    expect(searchDocs(docs, '테슬라')).toEqual([]);
  });

  it('결과 개수를 제한한다', () => {
    const many = Array.from({ length: 150 }, (_, i) => doc(String(i), '반도체'));
    expect(searchDocs(many, '반도체')).toHaveLength(100);
  });

  it('검색어 강조 조각', () => {
    expect(highlightSegments('삼성 HBM4 양산', ['hbm'])).toEqual([
      { text: '삼성 ', match: false },
      { text: 'HBM', match: true },
      { text: '4 양산', match: false },
    ]);
  });
});

describe('detectPlatform (D7)', () => {
  const safari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  it.each([
    [safari, false, 0, 'ios-safari'],
    [safari.replace('Version/18.0', 'CriOS/130.0'), false, 0, 'ios-other'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0', false, 0, 'ios-other'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15', false, 5, 'ios-safari'],
    ['Mozilla/5.0 (Linux; Android 15; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36', false, 5, 'android'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36', false, 0, 'desktop'],
    [safari, true, 0, 'standalone'],
  ])('%#', (ua, standalone, touch, expected) => {
    expect(detectPlatform(ua as string, standalone as boolean, touch as number)).toBe(expected);
  });
});

describe('섹션 이동 id (Design Audit F1)', () => {
  it.each(['반도체 업황 (HBM·DRAM·촉매)', '국내', '3. 증시: 코스피 약세·코스닥 강세', '오늘의 한 줄'])(
    '브라우저가 인코딩한 해시를 디코딩하면 헤딩 id와 같다: %s',
    (heading) => {
      const id = sectionId(heading);
      const hash = `#${encodeURIComponent(id)}`;
      expect(idFromHash(hash)).toBe(id);
    },
  );

  it('잘못된 인코딩이어도 예외 없이 원문을 쓴다', () => {
    expect(idFromHash('#sec-%E0%A4%A')).toBe('sec-%E0%A4%A');
  });
});
