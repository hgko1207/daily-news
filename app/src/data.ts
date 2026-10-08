import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import type { Aggregates, DayData, IndexData, SearchDoc } from './types.ts';

dayjs.extend(utc);
dayjs.extend(timezone);

const BASE = `${import.meta.env?.BASE_URL ?? '/'}data/`;

/** 브리핑이 보통 도착하는 시각(KST 10:30). 이 전이면 "곧 도착", 이후면 "아직 없음". */
export const ARRIVAL_CUTOFF_MINUTES = 10 * 60 + 30;

export function kstNow(now: Date = new Date()): { date: string; minutes: number } {
  const k = dayjs(now).tz('Asia/Seoul');
  return { date: k.format('YYYY-MM-DD'), minutes: k.hour() * 60 + k.minute() };
}

export type TodayNotice = null | 'arriving' | 'missing';

/**
 * 오늘 탭에 보여줄 날짜와 안내(Design Review D6).
 * KST 오늘 파일이 없으면 최신 브리핑을 그대로 보여주고, 10:30 전/후로 안내 문구만 바꾼다.
 */
export function todayView(index: IndexData, now: Date = new Date()): { date: string | null; isToday: boolean; notice: TodayNotice } {
  const { date, minutes } = kstNow(now);
  if (index.days.some((d) => d.date === date)) return { date, isToday: true, notice: null };
  return {
    date: index.latestDate,
    isToday: false,
    notice: index.latestDate ? (minutes < ARRIVAL_CUTOFF_MINUTES ? 'arriving' : 'missing') : null,
  };
}

/**
 * 지면 호수: 그날까지 나온 브리핑 수. 날짜 차이로 세지 않는다(스케줄러가 쉰 날은 호수가 없다).
 * days는 최신순이다. 없는 날짜면 null.
 */
export function issueNumber(index: IndexData, date: string): number | null {
  const pos = index.days.findIndex((d) => d.date === date);
  return pos === -1 ? null : index.days.length - pos;
}

/** 새 브리핑 날짜가 생겼는지(토스트 대상). 같은 날짜 재생성은 조용히 갱신한다. */
export function hasNewBriefing(prev: IndexData | null, next: IndexData): boolean {
  return !!prev && !!next.latestDate && (prev.latestDate ?? '') < next.latestDate;
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

// GitHub Pages는 cache-control: max-age=600을 준다. 목록 파일은 ETag로 매번 재검증한다(Eng Review D4).
export const fetchIndex = () => getJson<IndexData>('index.json', { cache: 'no-cache' });
export const fetchAggregates = () => getJson<Aggregates>('aggregates.json', { cache: 'no-cache' });
export const fetchDay = (date: string) => getJson<DayData>(`days/${date}.json`);
export const fetchSearchFile = (file: string) => getJson<SearchDoc[]>(file);
