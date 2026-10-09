import { Box, Skeleton, Typography } from '@wanteddev/wds';
import { IconChevronRightSmall } from '@wanteddev/wds-icon';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SERIF_TYPE, SR_ONLY, kstTime, metaColor } from './layout.tsx';
import { useStore } from './store.tsx';
import {
  RAIN_SHOW,
  SEOUL,
  fetchForecast,
  loadSaved,
  locate,
  locationGranted,
  placeName,
  save,
  summarize,
  type Place,
  type Saved,
} from './weather.ts';

type Status = 'ask' | 'loading' | 'ready' | 'hidden';

/** 이보다 오래된 예보만 다시 받는다. */
const FRESH_MS = 30 * 60 * 1000;
/** 이만큼(약 1km) 움직였을 때만 동 이름을 다시 찾는다. */
const MOVED = 0.01;

async function gpsPlace(): Promise<Place> {
  const { latitude: lat, longitude: lon } = (await locate()).coords;
  return { lat, lon, name: (await placeName(lat, lon)) ?? '내 위치', source: 'gps' };
}

function useWeather() {
  const saved = useRef<Saved>(loadSaved());
  const [, rerender] = useState(0);
  const [status, setStatus] = useState<Status>(() => (saved.current.place ? (saved.current.forecast ? 'ready' : 'loading') : 'ask'));
  const [stale, setStale] = useState(false);

  const refresh = useCallback(async (place: Place) => {
    try {
      const forecast = await fetchForecast(place.lat, place.lon);
      saved.current = { place, forecast };
      save(saved.current);
      setStale(false);
      setStatus('ready');
    } catch {
      // 실패하면 마지막으로 받은 예보를 시각과 함께 보여주고, 받은 적이 없으면 날씨 줄을 숨긴다.
      if (saved.current.forecast) {
        setStale(true);
        setStatus('ready');
      } else {
        saved.current = { place };
        save(saved.current);
        setStatus('hidden');
      }
    }
    rerender((n) => n + 1);
  }, []);

  /** "내 위치 날씨 보기" 또는 "다시 시도". 권한은 이때만 묻는다. */
  const request = useCallback(async () => {
    setStatus('loading');
    let place: Place;
    try {
      place = await gpsPlace();
    } catch (e) {
      const denied = (e as { code?: number } | null)?.code === 1;
      place = { ...SEOUL, source: denied ? 'denied' : 'unavailable' };
    }
    await refresh(place);
  }, [refresh]);

  useEffect(() => {
    const place = saved.current.place;
    if (!place) return;
    const fetchedAt = saved.current.forecast?.fetchedAt;
    if (!fetchedAt || Date.now() - Date.parse(fetchedAt) > FRESH_MS) void refresh(place);
    // 권한이 이미 있으면 조용히 위치를 다시 확인한다(이동했으면 그 동네 날씨로)
    if (place.source !== 'gps') return;
    void (async () => {
      if (!(await locationGranted())) return;
      try {
        const { latitude: lat, longitude: lon } = (await locate()).coords;
        if (Math.abs(lat - place.lat) < MOVED && Math.abs(lon - place.lon) < MOVED) return;
        await refresh({ lat, lon, name: (await placeName(lat, lon)) ?? '내 위치', source: 'gps' });
      } catch {
        /* 기존 위치 유지 */
      }
    })();
  }, [refresh]);

  return { status, stale, saved: saved.current, request };
}

const hairlines = (t: { semantic: { line: { normal: { normal: string } } } }) => ({
  borderTop: `1px solid ${t.semantic.line.normal.normal}`,
  borderBottom: `1px solid ${t.semantic.line.normal.normal}`,
});

/** 텍스트 링크처럼 보이는 버튼. 보이는 크기는 그대로, 눌리는 영역만 44px. */
function InlineAction({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <Box
      as="button"
      type="button"
      onClick={onClick}
      sx={(t) => ({
        display: 'inline-flex',
        alignItems: 'center',
        padding: '12px 0',
        margin: '-12px 0',
        border: 0,
        background: 'none',
        cursor: 'pointer',
        color: t.semantic.primary.normal,
        font: 'inherit',
        fontWeight: 600,
      })}
    >
      {children}
    </Box>
  );
}

/** 오늘 탭 날씨(W3안): 위치·하늘·비 한 줄 + 출근·점심·퇴근 세 칸. */
export function WeatherStrip() {
  const { online } = useStore();
  const { status, stale, saved, request } = useWeather();
  const day = saved.forecast ? summarize(saved.forecast) : null;

  if (status === 'hidden') return null;

  if (status === 'ask') {
    return (
      <Box as="section" aria-label="날씨" sx={(t) => ({ marginTop: 16, padding: '12px 0', ...hairlines(t) })}>
        <InlineAction onClick={() => void request()}>
          <Typography variant="body1" weight="bold" color="semantic.primary.normal">
            내 위치 날씨 보기
          </Typography>
          <IconChevronRightSmall aria-hidden />
        </InlineAction>
        <Typography as="p" variant="label2" sx={(t) => ({ display: 'block', marginTop: 4, color: metaColor(t) })}>
          위치는 날씨를 찾는 데만 쓰고, 이 기기에만 저장해요
        </Typography>
      </Box>
    );
  }

  if (status === 'loading' || !day || !saved.place) {
    // 준비됐는데 오늘 칸을 못 만들면(며칠 지난 예보) 받는 중으로 본다
    if (status === 'ready' && !day && stale) return null;
    return (
      <Box as="section" aria-label="날씨 불러오는 중" aria-busy sx={(t) => ({ marginTop: 16, padding: '12px 0', ...hairlines(t) })}>
        <Skeleton variant="text" width="70%" height={18} />
        <Skeleton variant="text" width="100%" height={48} sx={{ marginTop: 10 }} />
      </Box>
    );
  }

  const place = saved.place;
  const note =
    place.source === 'denied'
      ? '위치 권한이 꺼져 있어 서울 기준이에요'
      : place.source === 'unavailable'
        ? '위치를 찾지 못해 서울 기준이에요'
        : null;

  return (
    <Box as="section" aria-label={day.tomorrow ? '내일 날씨' : '오늘 날씨'} sx={{ marginTop: 16, fontVariantNumeric: 'tabular-nums' }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', columnGap: 8, rowGap: 2 }}>
        <Typography as="p" variant="label2" weight="bold" color="semantic.label.normal">
          {place.name}
          <Typography as="span" variant="label2" weight="medium" sx={(t) => ({ color: metaColor(t) })}>
            {` · ${day.tomorrow ? '내일 ' : ''}${day.sky} · 비 ${day.rain}%`}
          </Typography>
        </Typography>
        {day.advice && (
          <Typography as="p" variant="caption1" weight="medium" sx={(t) => ({ color: metaColor(t) })}>
            {day.advice}
          </Typography>
        )}
      </Box>
      <Box
        as="ol"
        sx={(t) => ({
          listStyle: 'none',
          margin: '10px 0 0',
          padding: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          ...hairlines(t),
        })}
      >
        {day.slots.map((s, i) => (
          <Box
            as="li"
            key={s.label}
            sx={(t) => ({
              padding: i === 0 ? '10px 0' : '10px 0 10px 12px',
              borderLeft: i === 0 ? 'none' : `1px solid ${t.semantic.line.normal.normal}`,
            })}
          >
            {/* li의 aria-label은 스크린 리더마다 지원이 달라, 읽을 문장을 숨긴 글자로 둔다(Technical Audit P3) */}
            <Box as="span" sx={SR_ONLY}>
              {`${s.label} ${s.hour}시 ${s.temp}도 ${s.sky}${s.rain >= RAIN_SHOW ? ` 비 ${s.rain}%` : ''}`}
            </Box>
            <Typography as="span" aria-hidden variant="caption1" weight="bold" color="semantic.label.neutral" sx={{ display: 'block' }}>
              {s.label}{' '}
              <Typography as="span" variant="caption1" weight="medium" sx={(t) => ({ color: metaColor(t) })}>
                {s.hour}시
              </Typography>
            </Typography>
            <Box aria-hidden sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 6, marginTop: 2 }}>
              <Typography
                as="span"
                variant="title3"
                weight="bold"
                color="semantic.label.normal"
                sx={SERIF_TYPE.temperature}
              >
                {s.temp}°
              </Typography>
              <Typography as="span" variant="caption1" sx={(t) => ({ color: metaColor(t) })}>
                {s.rain >= RAIN_SHOW ? `비 ${s.rain}%` : s.sky}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
      {(note || stale) && (
        <Typography as="p" variant="caption1" sx={(t) => ({ display: 'block', marginTop: 6, color: metaColor(t) })}>
          {note ?? `${online ? '' : '오프라인 · '}${kstTime(saved.forecast!.fetchedAt)} 기준`}
          {note && (
            <>
              {' · '}
              <InlineAction onClick={() => void request()}>다시 시도</InlineAction>
            </>
          )}
        </Typography>
      )}
    </Box>
  );
}
