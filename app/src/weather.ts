import dayjs from 'dayjs';
import { kstNow } from './data.ts';

/**
 * 오늘 탭 날씨(W3안: 출근·점심·퇴근).
 * 예보는 Open-Meteo, 동 이름은 BigDataCloud에서 받는다. 둘 다 키가 필요 없어 정적 사이트에서 바로 부른다.
 * 위치와 마지막 예보는 이 기기의 localStorage에만 둔다.
 */

export interface Place {
  lat: number;
  lon: number;
  name: string;
  /** gps: 내 위치 / denied: 권한 거절로 서울 / unavailable: 위치를 못 찾아 서울 */
  source: 'gps' | 'denied' | 'unavailable';
}

export interface Forecast {
  fetchedAt: string;
  hourly: { time: string[]; temperature_2m: number[]; precipitation_probability: (number | null)[]; weather_code: number[] };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
    weather_code: number[];
  };
}

export interface Slot {
  label: string;
  hour: number;
  temp: number;
  sky: string;
  rain: number;
}

export interface DayWeather {
  date: string;
  tomorrow: boolean;
  sky: string;
  min: number;
  max: number;
  rain: number;
  slots: Slot[];
  advice: string | null;
}

export const SEOUL = { lat: 37.57, lon: 126.98, name: '서울' };

const SLOTS: [string, number][] = [
  ['출근', 8],
  ['점심', 12],
  ['퇴근', 18],
];

/** 이 시각(KST) 이후에는 내일 날씨를 보여준다. 저녁에 오늘 출근 날씨는 쓸모가 없다. */
export const TOMORROW_FROM_HOUR = 19;
/** 이 확률 이상이면 우산 안내, 칸에도 비 확률을 띄운다. */
export const RAIN_ADVICE = 50;
export const RAIN_SHOW = 30;
/** 일교차가 이 이상이면 겉옷 안내. */
export const RANGE_ADVICE = 10;

/** WMO 날씨 코드 → 짧은 한국어. */
export function skyLabel(code: number): string {
  if (code <= 1) return '맑음';
  if (code === 2) return '구름 조금';
  if (code === 3) return '흐림';
  if (code === 45 || code === 48) return '안개';
  if (code >= 51 && code <= 57) return '이슬비';
  if (code >= 61 && code <= 67) return '비';
  if (code >= 71 && code <= 77) return '눈';
  if (code >= 80 && code <= 82) return '소나기';
  if (code === 85 || code === 86) return '눈';
  if (code >= 95) return '뇌우';
  return '흐림';
}

export function advice(rain: number, min: number, max: number): string | null {
  const range = max - min;
  const umbrella = rain >= RAIN_ADVICE;
  const coat = range >= RANGE_ADVICE;
  if (umbrella && coat) return '우산·겉옷 챙기세요';
  if (umbrella) return '우산 챙기세요';
  if (coat) return `일교차 ${range}° · 겉옷 챙기세요`;
  return null;
}

/** 예보에서 오늘(저녁이면 내일)의 출근·점심·퇴근 칸을 뽑는다. 해당 날짜가 없으면 null. */
export function summarize(f: Forecast, now: Date = new Date()): DayWeather | null {
  const { date, minutes } = kstNow(now);
  const tomorrow = minutes >= TOMORROW_FROM_HOUR * 60;
  const target = tomorrow ? dayjs(date).add(1, 'day').format('YYYY-MM-DD') : date;
  const d = f.daily.time.indexOf(target);
  if (d === -1) return null;

  const slots: Slot[] = [];
  for (const [label, hour] of SLOTS) {
    const i = f.hourly.time.indexOf(`${target}T${String(hour).padStart(2, '0')}:00`);
    if (i === -1) return null;
    slots.push({
      label,
      hour,
      temp: Math.round(f.hourly.temperature_2m[i]!),
      sky: skyLabel(f.hourly.weather_code[i]!),
      rain: f.hourly.precipitation_probability[i] ?? 0,
    });
  }
  const min = Math.round(f.daily.temperature_2m_min[d]!);
  const max = Math.round(f.daily.temperature_2m_max[d]!);
  const rain = f.daily.precipitation_probability_max[d] ?? 0;
  return { date: target, tomorrow, sky: skyLabel(f.daily.weather_code[d]!), min, max, rain, slots, advice: advice(rain, min, max) };
}

/** 좌표는 소수 둘째 자리(약 1km)로 줄여서 보낸다. */
const round = (n: number) => Math.round(n * 100) / 100;

async function getJson<T>(url: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function fetchForecast(lat: number, lon: number): Promise<Forecast> {
  const q = new URLSearchParams({
    latitude: String(round(lat)),
    longitude: String(round(lon)),
    hourly: 'temperature_2m,precipitation_probability,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
    timezone: 'Asia/Seoul',
    forecast_days: '2',
  });
  const data = await getJson<Omit<Forecast, 'fetchedAt'>>(`https://api.open-meteo.com/v1/forecast?${q}`);
  return { fetchedAt: new Date().toISOString(), hourly: data.hourly, daily: data.daily };
}

/** 좌표 → "서초4동". 실패하면 null(이름 없이 "내 위치"로 보여준다). */
export async function placeName(lat: number, lon: number): Promise<string | null> {
  try {
    const q = new URLSearchParams({ latitude: String(round(lat)), longitude: String(round(lon)), localityLanguage: 'ko' });
    const g = await getJson<{ locality?: string; city?: string }>(`https://api.bigdatacloud.net/data/reverse-geocode-client?${q}`);
    return g.locality || g.city || null;
  } catch {
    return null;
  }
}

export function locate(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject({ code: 2 });
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, maximumAge: 30 * 60 * 1000 });
  });
}

/** 위치 권한이 이미 허용돼 있는지. 묻지 않고 확인만 한다(Permissions API가 없으면 false). */
export async function locationGranted(): Promise<boolean> {
  try {
    const p = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
    return p?.state === 'granted';
  } catch {
    return false;
  }
}

const KEY = 'weather:v1';

export interface Saved {
  place?: Place;
  forecast?: Forecast;
}

export function loadSaved(): Saved {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Saved;
  } catch {
    return {};
  }
}

export function save(next: Saved): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* 저장소 접근 불가 시 무시 */
  }
}
