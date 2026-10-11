import { Box, Button, Divider, SectionHeader, SegmentedControl, SegmentedControlItem, TextButton, Typography, useThemeControl, useToast } from '@wanteddev/wds';
import { IconCircleCheckFill, IconCopy, IconLocation, IconRefresh } from '@wanteddev/wds-icon';
import { useEffect, useState, type ReactNode } from 'react';
import { canPromptInstall, detectPlatform, isStandalone, onInstallPromptChange, promptInstall, type InstallPlatform } from '../install.ts';
import { CHIP_HIT, Caption, Page, SCROLL_MARGIN, TEXT_BUTTON_HIT, kstTime, longDate } from '../layout.tsx';
import { useStore } from '../store.tsx';
import { SEOUL, clearSaved, gpsPlace, loadSaved, save, type Place } from '../weather.ts';

const REPO_URL = 'https://github.com/hgko1207/daily-news';
const APP_URL = 'https://hgko1207.github.io/daily-news/';

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <Box as="ol" sx={{ margin: '8px 0 0', paddingLeft: 20, listStyle: 'decimal' }}>
      {items.map((item, i) => (
        <Typography key={i} as="li" variant="body2-reading" sx={{ display: 'list-item', marginBottom: 6 }}>
          {item}
        </Typography>
      ))}
    </Box>
  );
}

function InstallGuide({ platform }: { platform: InstallPlatform }) {
  const toast = useToast();
  const [canPrompt, setCanPrompt] = useState(canPromptInstall);
  useEffect(() => onInstallPromptChange(() => setCanPrompt(canPromptInstall())), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(APP_URL);
      toast({ content: '주소를 복사했어요. Safari에 붙여넣어 주세요', variant: 'positive' });
    } catch {
      toast({ content: APP_URL, duration: 'long' });
    }
  };

  const ios = (
    <Steps
      items={[
        'Safari 아래쪽의 공유 버튼(네모에 위쪽 화살표)을 누르세요',
        '목록을 올려 "홈 화면에 추가"를 누르세요',
        '오른쪽 위 "추가"를 누르면 홈 화면에 브리핑 아이콘이 생겨요',
      ]}
    />
  );
  const android = (
    <>
      {canPrompt && (
        <Button size="medium" fullWidth onClick={() => void promptInstall()} sx={{ marginTop: 8 }}>
          앱 설치
        </Button>
      )}
      <Steps
        items={[
          'Chrome 오른쪽 위 메뉴(⋮)를 누르세요',
          '"앱 설치" 또는 "홈 화면에 추가"를 누르세요',
          '"설치"를 누르면 홈 화면과 앱 목록에 브리핑이 생겨요',
        ]}
      />
    </>
  );

  switch (platform) {
    case 'standalone':
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
          <IconCircleCheckFill aria-hidden sx={(t) => ({ color: t.semantic.status.positive, fontSize: 20 })} />
          <Typography variant="body1" weight="bold">
            설치됨
          </Typography>
        </Box>
      );
    case 'ios-safari':
      return ios;
    case 'ios-other':
      return (
        <>
          <Typography as="p" variant="body2-reading" weight="bold" sx={{ display: 'block' }}>
            Safari로 열어야 홈 화면에 추가할 수 있어요
          </Typography>
          <Caption>카카오톡·Chrome 등에서 열었다면 주소를 복사해 Safari에 붙여넣어 주세요.</Caption>
          <Button variant="outlined" color="assistive" size="small" leadingContent={<IconCopy />} onClick={() => void copy()} sx={{ ...CHIP_HIT, marginTop: 8 }}>
            주소 복사
          </Button>
          <Box sx={{ marginTop: 16 }}>
            <Caption>Safari에서 연 다음</Caption>
            {ios}
          </Box>
        </>
      );
    case 'android':
      return android;
    case 'desktop':
      return (
        <>
          <Caption>휴대폰에서 아래 주소를 열고 이 화면의 안내를 따라 주세요.</Caption>
          <Typography as="p" variant="body2" weight="bold" sx={{ display: 'block', margin: '6px 0 12px', wordBreak: 'break-all' }}>
            {APP_URL}
          </Typography>
          <Typography as="p" variant="label1" weight="bold" sx={{ display: 'block' }}>
            iPhone (Safari)
          </Typography>
          {ios}
          <Typography as="p" variant="label1" weight="bold" sx={{ display: 'block', marginTop: 12 }}>
            Android (Chrome)
          </Typography>
          {android}
        </>
      );
  }
}

/**
 * 오늘 탭 날씨의 위치 관리(디자인 점검 10/11 8번). 한 번 허용하면 위치를 바꾸거나 지울 방법이 없었다.
 * 저장소는 오늘 탭과 같은 weather:v1. 위치를 바꾸면 예보를 비워 오늘 탭이 새로 받게 한다.
 */
function WeatherSettings() {
  const toast = useToast();
  const [place, setPlace] = useState<Place | undefined>(() => loadSaved().place);
  const [locating, setLocating] = useState(false);

  const use = (next: Place, message: string) => {
    save({ place: next });
    setPlace(next);
    toast({ content: message, variant: 'positive' });
  };
  const relocate = async () => {
    setLocating(true);
    try {
      const next = await gpsPlace();
      use(next, `${next.name} 기준으로 바꿨어요`);
    } catch (e) {
      const denied = (e as { code?: number } | null)?.code === 1;
      toast({ content: denied ? '위치 권한이 꺼져 있어요. 브라우저 설정에서 허용해 주세요' : '위치를 찾지 못했어요. 잠시 뒤 다시 시도해 주세요', variant: 'cautionary' });
    } finally {
      setLocating(false);
    }
  };
  const clear = () => {
    clearSaved();
    setPlace(undefined);
    toast({ content: '위치 정보를 지웠어요', variant: 'positive' });
  };

  const status = !place
    ? '아직 정하지 않았어요. 오늘 탭에서 "내 위치 날씨 보기"를 누르면 정해져요.'
    : place.source === 'gps'
      ? `${place.name} · 내 위치`
      : place.source === 'fixed'
        ? `${place.name} · 고정`
        : `${place.name} · 위치를 쓸 수 없어 서울 기준`;

  return (
    <>
      <Typography as="p" variant="body2" sx={{ display: 'block' }}>
        {status}
      </Typography>
      <Caption>위치는 이 기기에만 저장하고, 예보를 받을 때만 약 1km 단위로 보내요.</Caption>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <Button variant="outlined" color="assistive" size="small" loading={locating} leadingContent={<IconLocation />} onClick={() => void relocate()} sx={CHIP_HIT}>
          위치 다시 찾기
        </Button>
        {place?.source !== 'fixed' && (
          <Button variant="outlined" color="assistive" size="small" onClick={() => use({ ...SEOUL, source: 'fixed' }, '서울로 고정했어요')} sx={CHIP_HIT}>
            서울로 고정
          </Button>
        )}
        {place && (
          <Button variant="outlined" color="assistive" size="small" onClick={clear} sx={CHIP_HIT}>
            위치 정보 지우기
          </Button>
        )}
      </Box>
    </>
  );
}

export function Settings() {
  const { index, reloadIndex } = useStore();
  const { themeOriginValue, setTheme } = useThemeControl();
  const [platform] = useState(() =>
    detectPlatform(navigator.userAgent, isStandalone(), navigator.maxTouchPoints ?? 0),
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (location.hash.endsWith('#install')) document.getElementById('install')?.scrollIntoView();
  }, []);

  const section = (id: string, title: string, body: ReactNode) => (
    <Box as="section" id={id} aria-labelledby={`${id}-title`} sx={{ padding: '20px 0', scrollMarginTop: SCROLL_MARGIN }}>
      <SectionHeader size="small" headingTag="h2" id={`${id}-title`}>
        {title}
      </SectionHeader>
      <Box sx={{ paddingTop: 8 }}>{body}</Box>
    </Box>
  );

  return (
    <Page title="설정" search={false}>
      {section('install', '앱 설치 방법', <InstallGuide platform={platform} />)}
      <Divider />
      {section(
        'theme',
        '화면 모드',
        <SegmentedControl value={themeOriginValue ?? 'system'} onValueChange={(v) => setTheme(v)} size="small">
          <SegmentedControlItem value="system">시스템</SegmentedControlItem>
          <SegmentedControlItem value="light">라이트</SegmentedControlItem>
          <SegmentedControlItem value="dark">다크</SegmentedControlItem>
        </SegmentedControl>,
      )}
      <Divider />
      {section('weather', '날씨 위치', <WeatherSettings />)}
      <Divider />
      {section(
        'data',
        '데이터',
        index.status === 'ready' ? (
          <>
            <Typography as="p" variant="body2" sx={{ display: 'block' }}>
              최신 브리핑 {index.data.latestDate ? longDate(index.data.latestDate) : '없음'}
            </Typography>
            <Caption>마지막 업데이트 {kstTime(index.data.generatedAt)} · 총 {index.data.days.length}일</Caption>
            <Button
              variant="outlined"
              color="assistive"
              size="small"
              loading={refreshing}
              leadingContent={<IconRefresh />}
              onClick={async () => {
                setRefreshing(true);
                await reloadIndex();
                setRefreshing(false);
              }}
              sx={{ ...CHIP_HIT, marginTop: 12 }}
            >
              새로고침
            </Button>
          </>
        ) : (
          <Caption>불러오는 중…</Caption>
        ),
      )}
      <Divider />
      {section(
        'about',
        '정보',
        <>
          <Caption>Claude가 매일 아침 정리하는 개인 브리핑입니다. 정보 제공용이며 투자 조언이 아닙니다.</Caption>
          <TextButton as="a" href={REPO_URL} target="_blank" rel="noopener noreferrer" size="small" sx={{ ...TEXT_BUTTON_HIT, marginTop: 8 }}>
            GitHub 저장소
          </TextButton>
          <Caption>버전 {__APP_VERSION__}</Caption>
        </>,
      )}
    </Page>
  );
}
