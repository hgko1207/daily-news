# 기술 품질 감사 — app/ (2026-10-09)

대상: `app/src` 전체(커밋 d9cc7ce), 빌드 산출물 `app/dist`, Montage(`@wanteddev/wds` 3.12.2) 토큰 실제 값.
방식: 코드 정적 점검. 대비는 Montage `theme.css`의 토큰 값을 배경 위에 합성해 WCAG 공식으로 계산했다. 브라우저 실측은 하지 않았다.
기준: [.impeccable.md](../.impeccable.md)의 Design Context, WCAG 2.2 AA.
범위: 수정하지 않고 기록만 한다. 시각 디자인 감사는 [design-audit-2026-10-08.md](./design-audit-2026-10-08.md) 참고.

## 점수

| # | 영역 | 점수 | 핵심 발견 |
|---|---|---|---|
| 1 | 접근성 | 3 | 보조 텍스트(`label.alternative`) 대비 3.67:1, 34곳 |
| 2 | 성능 | 3 | JS 한 덩어리 228KB(gzip), 화면별 분할 없음 |
| 3 | 반응형 | 3 | 달력이 폭 340px 미만에서 가로로 넘침 |
| 4 | 테마 | 3 | 다크 모드에서 첫 화면 흰 번쩍임, 상태 표시줄 파란색 고정 |
| 5 | 안티패턴 | 4 | AI 티 없음. 지면 문법(제호·괘선·번호)이 정체성 |
| **합계** | | **16/20** | **Good**(약한 영역 보완) |

## 안티패턴 판정: 통과

AI가 만든 화면처럼 보이지 않는다. 그라데이션 텍스트, 글래스 카드, 네온, 아이콘 카드 그리드, 히어로 숫자, 왼쪽 굵은 세로선, 카드 안 카드가 모두 없다. 표의 오른쪽 흐림 그라데이션은 "더 있음" 표시라는 기능이 있다. 세리프는 제호·지면 번호·기온·말씀에만 쓰고 긴 문장은 Pretendard를 쓴다. `.impeccable.md` 규칙을 그대로 지킨다.

굳이 꼽으면 오늘 탭 외 네 화면(지난 브리핑·모아보기·검색·설정)은 Montage 기본 모양 그대로라 오늘 탭만큼 개성이 없다. AI 티는 아니고 의도된 "Montage를 거스르지 않는다"의 결과다.

## 요약

- 점수 **16/20 (Good)**
- 발견 12건: P0 0 · P1 1 · P2 6 · P3 5
- 가장 중요한 것
  1. **[P1]** `label.alternative` 대비 3.67:1(다크 3.78:1)로 AA 4.5:1 미달. 날짜, 제N호, 날씨 세부, 캡션 등 34곳
  2. **[P2]** 다크 모드 첫 화면 흰 번쩍임과 파란 상태 표시줄(`theme-color` 고정)
  3. **[P2]** `<li role="link">` 패턴 4곳: 목록 의미가 깨지고 진짜 링크가 아님
  4. **[P2]** JS 한 덩어리 228KB(gzip). 마크다운 렌더러가 오늘 탭 첫 로드에도 포함됨
  5. **[P2]** 달력 가로 넘침(폭 340px 미만), 달력 grid ARIA 구조 오류

## 세부 발견

### P1

**[P1] 보조 텍스트 대비 부족 — `label.alternative`**
- 위치: `Caption` 컴포넌트([layout.tsx:212](../app/src/layout.tsx#L212))를 쓰는 18곳 + 직접 지정 14곳 + `TextButton color="assistive"` 2곳([Collect.tsx:94](../app/src/routes/Collect.tsx#L94), [:100](../app/src/routes/Collect.tsx#L100). Montage 내부에서 `label.alternative`를 씀)
  - 오늘 탭: 헤더 날짜([Today.tsx:123](../app/src/routes/Today.tsx#L123)), 제N호·업데이트 시각([:62](../app/src/routes/Today.tsx#L62)), "오늘의 지면"([:223](../app/src/routes/Today.tsx#L223)), 지면 번호([:253](../app/src/routes/Today.tsx#L253)), "오늘의 말씀"([:293](../app/src/routes/Today.tsx#L293))
  - 날씨: 하늘·비 확률, 시각, 조언, 안내 문구([weather-strip.tsx:141-227](../app/src/weather-strip.tsx#L141-L227))
  - 달력 요일, 종목 코드, 완료 액션, 검색 결과 날짜·카테고리, 설정 캡션
- 분류: 접근성
- 측정값: `#37383C` 61% on `#FFFFFF` = **3.67:1**, 다크 `#AEB0B6` 61% on `#1B1C1E` = **3.78:1**. 대부분 12~13px(caption1, label2)이라 큰 글자 예외(3:1)도 해당 안 된다.
- 영향: 출근길 햇빛 아래 폰에서 날짜·날씨 시각·호수가 흐리게 보인다. "3초 파악"에 쓰는 메타 정보가 가장 읽기 어렵다.
- 기준: WCAG 1.4.3 Contrast (Minimum), `.impeccable.md` 원칙 5 "대비는 4.5:1 이상"
- 참고: 10/8 감사 F16에서 A안(요약문만 `neutral`)으로 정리한 항목이다. 여전히 AA 미달이고 원칙 5와 맞지 않아 다시 적는다. 그대로 두기로 한다면 원칙 5 문구를 "본문 4.5:1, 보조 메타는 Montage alternative 허용"으로 바꿔 기준과 구현을 맞추는 게 낫다.
- 권장: 위계는 크기·굵기·괘선으로 이미 충분히 갈린다. 보조 텍스트를 `label.neutral`(9.09:1)로 올리거나, alternative와 neutral 사이 불투명도(약 72% 이상이면 4.5:1)의 앱 전용 토큰 하나를 만들어 `Caption`과 위 지점에 일괄 적용한다. `TextButton`은 `color` 오버라이드로 같은 토큰을 준다.
- 명령: `/normalize`

### P2

**[P2] 다크 모드 첫 화면 흰 번쩍임 + 상태 표시줄 파란색 고정**
- 위치: [index.html:6](../app/index.html#L6) `theme-color #0066FF`, [vite.config.ts:26-27](../app/vite.config.ts#L26-L27) manifest `theme_color`·`background_color: #FFFFFF`. `index.html`에 `color-scheme`도 배경색도 없다.
- 분류: 테마
- 영향: 배경색은 JS(228KB)가 실행된 뒤 Emotion `Global`로 칠해진다. 다크 모드 사용자는 그 전까지 흰 화면을 보고, 설치 앱 실행 시 흰 스플래시가 뜬다. Android에서는 상태 표시줄이 항상 파란색이라 어두운 화면 위에 밝은 띠가 생기고, "강조색은 링크·선택 탭에만"이라는 규칙과도 어긋난다.
- 권장: `<meta name="color-scheme" content="light dark">`, `theme-color`를 `media="(prefers-color-scheme: light|dark)"` 두 개로 나눠 `background.normal.normal` 값(`#FFFFFF`/`#1B1C1E`) 지정, `<style>html{background:#fff}@media (prefers-color-scheme:dark){html{background:#1B1C1E}}</style>` 인라인. manifest `theme_color`도 배경색으로.
- 명령: `/normalize`

**[P2] `<li role="link">` 목록 행 — 목록 의미가 깨지고 진짜 링크가 아님**
- 위치: [Calendar.tsx:148-158](../app/src/routes/Calendar.tsx#L148-L158), [Collect.tsx:176-186](../app/src/routes/Collect.tsx#L176-L186), [Collect.tsx:220-229](../app/src/routes/Collect.tsx#L220-L229), [Search.tsx:109-118](../app/src/routes/Search.tsx#L109-L118)
- 분류: 접근성
- 영향: `role="link"`가 `li`의 listitem 역할을 덮어써서 스크린 리더가 "목록, N개 항목"을 알려주지 못한다. `href`가 없어 길게 눌러 새 탭으로 열기·주소 복사가 안 되고, Space 키도 처리하지 않는다. 오늘 탭은 진짜 `<Link>`를 쓰고 있어 화면마다 방식이 다르다.
- 기준: WCAG 1.3.1 Info and Relationships, 4.1.2 Name, Role, Value
- 권장: `li` 안에 `<Link to=…>`를 두고 행 전체를 링크로 만든다(오늘 탭 지면 목록과 같은 패턴). `onKeyDown` 처리도 함께 지운다.
- 명령: `/harden`

**[P2] 화면 제목에 h1 없음, 날짜 제목 안에 버튼**
- 위치: Montage `TopNavigation`이 제목을 `h2`로 그린다([layout.tsx:140](../app/src/layout.tsx#L140)). 오늘 탭만 제호가 `h1`. 상세 화면 제목은 [Day.tsx:58-82](../app/src/routes/Day.tsx#L58-L82)에서 ‹ › 버튼까지 `h2` 안에 들어간다.
- 분류: 접근성
- 영향: 지난 브리핑·모아보기·검색·설정·상세 다섯 화면에 h1이 없어 헤딩으로 훑을 때 시작점이 없다. 상세 화면 제목은 "이전 날짜 10/8 다음 날짜"로 읽힌다. (10/8 감사 F15에서 보류한 항목)
- 기준: WCAG 1.3.1, 2.4.6 Headings and Labels
- 권장: `Page`에서 제목을 시각적으로 숨긴 `h1`로 한 번 더 두거나 TopNavigation 제목 태그를 바꾼다. 상세 화면은 날짜만 제목으로 두고 ‹ ›는 제목 밖(leading/trailing)으로 뺀다.
- 명령: `/harden`

**[P2] 달력 grid ARIA 구조 오류**
- 위치: [Calendar.tsx:82-135](../app/src/routes/Calendar.tsx#L82-L135)
- 분류: 접근성
- 영향: `role="grid"` 바로 아래에 `columnheader`·`gridcell`이 있고 `role="row"`가 없다. grid 역할은 방향키 이동을 약속하는데 구현은 Tab 키뿐이라 최대 31번 눌러야 한다. 스크린 리더에 따라 표 구조를 잘못 읽는다.
- 기준: WCAG 4.1.2, WAI-ARIA grid 패턴
- 권장: 가장 싼 방법은 grid 역할을 빼고 버튼 목록(`role="group"` + 버튼의 `aria-label`, `aria-pressed`)으로 두는 것이다. grid를 유지하면 주 단위 `row`를 넣고 roving tabindex + 방향키를 구현한다.
- 명령: `/harden`

**[P2] 달력이 좁은 화면에서 가로로 넘침**
- 위치: [Calendar.tsx:82](../app/src/routes/Calendar.tsx#L82), [:104-105](../app/src/routes/Calendar.tsx#L104-L105)
- 분류: 반응형
- 영향: 날짜 버튼이 44px 고정이고 열이 `1fr`(최소 = 내용 폭)이라 7칸 최소 308px. 본문 폭이 화면 − 32px이므로 화면 폭 340px 미만(폭 320 기기, 데스크톱 400% 확대)에서 오른쪽 20px 이상이 잘리고 페이지가 옆으로 밀린다.
- 기준: WCAG 1.4.10 Reflow(320 CSS px)
- 권장: 버튼을 `width: 100%; max-width: 44px; aspect-ratio: 1`로, 열을 `repeat(7, minmax(0, 1fr))`로. 터치 영역은 셀 전체로 유지된다.
- 명령: `/adapt`

**[P2] JS 한 덩어리 228KB(gzip), 외부 글꼴 CSS가 렌더링을 막음**
- 위치: [App.tsx:5-10](../app/src/App.tsx#L5-L10) 모든 화면을 정적 import, [index.html:14-22](../app/index.html#L14-L22) jsdelivr·Google Fonts 스타일시트 두 개
- 분류: 성능
- 측정값: `dist/assets/index-*.js` 739KB(원본) / **228KB(gzip)**, 분할 없음
- 영향: 오늘 탭은 마크다운을 렌더하지 않는데 `react-markdown`·`remark-gfm`·표 컴포넌트까지 첫 로드에 받는다. 설치 후에는 서비스 워커 캐시 덕에 체감이 작지만, 첫 설치·앱 업데이트 직후·저사양 폰의 파싱 시간에 그대로 남는다. 외부 CSS 두 개는 캐시가 없을 때 첫 화면을 막는다.
- 권장: `Day`·`Search`·`Collect`·`Calendar`·`Settings`를 `React.lazy`로 분리(오늘 탭만 즉시). 마크다운 관련 코드가 `Day` 덩어리로 빠진다. 글꼴 CSS는 `media="print" onload` 패턴이나 `preload`로 비차단 처리.
- 명령: `/optimize`

### P3

**[P3] 날씨 칸 정보가 `li`의 aria-label에만 있음**
- 위치: [weather-strip.tsx:197](../app/src/weather-strip.tsx#L197), 자식은 모두 `aria-hidden`
- 영향: 화면 리더마다 `li`의 `aria-label` 지원이 고르지 않다. 무시하는 경우 세 칸이 빈 항목으로 읽힌다(가능성, 실기기 미확인).
- 권장: 보이는 글자는 그대로 두고 시각적으로 숨긴 `<span>`에 문장을 넣는다.
- 명령: `/harden`

**[P3] 섹션 칩 이동이 동작 줄이기 설정을 무시**
- 위치: [Day.tsx:150](../app/src/routes/Day.tsx#L150) `scrollIntoView({ behavior: 'smooth' })`
- 영향: 전역 CSS `scroll-behavior: auto`는 JS의 `behavior: 'smooth'` 옵션을 막지 못한다. 동작 줄이기를 켠 사용자에게도 부드러운 스크롤이 나간다.
- 권장: `matchMedia('(prefers-reduced-motion: reduce)')`일 때 `'auto'`.
- 명령: `/harden`

**[P3] 섹션 바로가기 줄: 역할 없는 aria-label, 데스크톱 스크롤 표시 없음**
- 위치: [Day.tsx:139-143](../app/src/routes/Day.tsx#L139-L143)
- 영향: 역할 없는 `div`의 `aria-label`은 무시된다(달력 필터는 `role="group"`을 줬다). 스크롤바를 숨겨서 마우스 사용 시 칩이 더 있는지 모른다.
- 권장: `role="navigation"` 또는 `group` 추가, 표처럼 오른쪽 흐림 표시 재사용.
- 명령: `/adapt`

**[P3] 글자 크기·간격 숫자가 토큰 밖에 흩어짐**
- 위치: `fontSize` 리터럴 6곳(36, 24, 20, 18, 15, 12), 여백 6·10·14·28 등. (10/8 감사 F14 보류 항목)
- 영향: 지금은 일관돼 보이지만, 같은 역할을 화면마다 다른 숫자로 쓰게 될 여지가 있다.
- 권장: 제호·기온·말씀 크기를 `layout.tsx`의 `SERIF` 옆에 이름 붙은 상수로 모으고, 여백은 4/8 단위로 맞춘다.
- 명령: `/typeset`

**[P3] 가로 모드 노치 영역 미처리**
- 위치: [layout.tsx:159](../app/src/layout.tsx#L159) 본문 좌우 16px 고정, `viewport-fit=cover`
- 영향: iPhone을 가로로 돌리면 본문 왼쪽 글자가 노치 쪽에 붙을 수 있다(최대 폭 680px이라 대부분 가운데로 몰려 실제 영향은 작다).
- 권장: `padding-left: max(16px, env(safe-area-inset-left))`, 오른쪽도 동일.
- 명령: `/adapt`

## 반복되는 문제

- **보조 텍스트 색 하나가 34곳에 퍼져 있다.** 원인은 개별 실수가 아니라 `Caption` 기본값과 Montage `alternative` 관례다. 한 곳(토큰 하나)에서 고치면 전부 해결된다.
- **목록 행을 링크로 만드는 방식이 두 가지다.** 오늘 탭은 진짜 `<Link>`, 나머지 네 곳은 `li role="link"` + `onClick`. 하나로 맞추면 접근성과 길게 누르기가 함께 해결된다.
- **Montage 컴포넌트의 기본 마크업을 그대로 믿는 곳에서 구조 문제가 난다.** TopNavigation 제목 h2, TextButton assistive 색. 새 Montage 컴포넌트를 쓸 때 렌더 결과(태그·색)를 한 번 확인하는 습관이 필요하다.

## 잘하고 있는 점

- **색 하드코딩 0건.** `src/`에 hex·rgb 리터럴이 하나도 없고 모두 Montage 시맨틱 토큰이다. 다크 모드가 화면 안에서는 빠짐없이 동작한다.
- **포커스와 동작 줄이기를 전역에서 처리.** `:focus-visible` 2px primary 외곽선, `prefers-reduced-motion`에서 애니메이션·전환 제거([App.tsx:44-48](../app/src/App.tsx#L44-L48)).
- **터치 영역 44px을 레이아웃을 흔들지 않고 확보.** `TOUCH_44`(음수 여백), `CHIP_HIT`(가상 요소), `InlineAction`(패딩·음수 여백) 세 가지 방식이 목적에 맞게 쓰였다.
- **캐시 전략이 데이터 성격에 맞다.** 목록 파일은 NetworkFirst + `no-cache` 재검증, 날짜 파일은 SWR, 글꼴은 CacheFirst, `data/`는 precache에서 제외([vite.config.ts:36-65](../app/vite.config.ts#L36-L65)).
- **색만으로 정보를 전하지 않는다.** 카테고리 점은 `aria-hidden`이고 항상 글자 라벨이 붙는다. 체크박스는 `label htmlFor`로 연결돼 문장 전체가 눌린다.
- **표 처리가 꼼꼼하다.** 가로 스크롤, 첫 열 고정, 더 있음 흐림 표시, 표 안에서는 스와이프 비활성.
- **개인정보를 아낀다.** 위치 권한은 버튼을 누를 때만 묻고, 좌표를 소수 둘째 자리로 줄여 보내며, 이 기기에만 저장한다.
- **상태 화면이 빠짐없다.** 로딩 스켈레톤, 오류 + 다시 시도, 오프라인 표시, 10시 전 안내, 빈 목록 문구가 모든 화면에 있다.

## 권장 순서

1. **[P1] `/normalize`** — 보조 텍스트 토큰 하나로 34곳 대비를 4.5:1 이상으로. 같은 작업에서 `theme-color`·`color-scheme`·첫 화면 배경도 정리(P2)
2. **[P2] `/harden`** — `li role="link"` 4곳을 진짜 링크로, 화면 h1과 상세 날짜 제목 정리, 달력 grid 역할 정리. P3 날씨 aria·smooth 스크롤도 함께
3. **[P2] `/adapt`** — 달력 320px 넘침, 섹션 칩 줄 표시, 가로 모드 노치
4. **[P2] `/optimize`** — 화면별 코드 분할, 글꼴 CSS 비차단
5. **[P3] `/typeset`** — 크기·간격 숫자를 이름 붙은 상수로(F14)
6. **`/polish`** — 마무리 점검

---

## 수정 결과

| 단계 | 항목 | 상태 | 확인 |
|---|---|---|---|
| 1 `/normalize` | [P1] 보조 텍스트 대비 | 수정 | `layout.tsx`에 `metaColor`(Montage `addOpacity`로 `label.alternative` 74%)를 두고 34곳 적용. 계산 대비 라이트 5.27:1, 다크 4.91:1. 빌드본에서 오늘 탭 메타·달력 요일·TextButton·종목 코드 계산 색 확인 |
| 1 `/normalize` | [P2] 다크 모드 첫 화면·상태 표시줄 | 수정 | `index.html`: `color-scheme`, 라이트/다크 `theme-color`, `html` 배경, 저장된 테마를 먼저 붙이는 스크립트. `App.tsx` `ThemeColorSync`가 `data-theme` 변화를 따라 상태 표시줄 색 갱신(라이트 `#ffffff`, 다크 `#1B1C1E` 확인). manifest `theme_color`는 `#FFFFFF` |
| 2 `/harden` | [P2] `li role="link"` 4곳 | 수정 | `layout.tsx` `LinkCell`(li 안 `ListCell as={Link}`)로 통일. 달력 미리보기·종목·종목 언급·검색 결과 모두 `li > a[href]`, `li[role=link]` 0개. 클릭·키보드 Enter 이동 확인 |
| 2 `/harden` | [P2] 화면 h1 없음·상세 제목 안 버튼 | 수정 | Montage 제목 h2에 `aria-level="1"`(태그를 두 번 두지 않음). 6개 화면 모두 1단계 제목 확인. 상세 화면은 "10월 8일 목요일 브리핑"으로 읽힘. 모아보기 날짜 묶음 h3→h2(단계 건너뜀 해소) |
| 2 `/harden` | [P2] 달력 grid ARIA | 수정 | grid·gridcell·columnheader 제거 → `role="group"` + 버튼 `aria-pressed`, 요일 머리글은 `aria-hidden`(버튼 이름에 요일 포함) |
| 2 `/harden` | [P3] 날씨 칸 aria-label | 수정 | 칸마다 화면에 숨긴 문장("출근 8시 18도 구름 조금") |
| 2 `/harden` | [P3] 칩 이동 smooth가 동작 줄이기 무시 | 수정 | `scrollToSection(id, smooth)`에서 `prefers-reduced-motion` 확인 |
| 2 `/harden` | (신규) 검색 결과로 들어가면 섹션 제목이 헤더에 가림 | 수정 | 상세 화면 로딩이 끝나는 순간 헤더에 탭·칩이 붙는데 `--header-h`가 한 박자 늦어 57px 기준으로 이동(제목 top 69px, 헤더 145px). `scrollToSection`이 이동 직전에 헤더 높이를 다시 잼 → top 157px 확인 |
| 3 `/adapt` | [P2] 달력 320px 넘침 | 수정 | 열 `minmax(0, 1fr)`, 버튼 `width: 100%; max-width: 44px; aspect-ratio: 1`. 폭 320에서 버튼 41px·달력 288px(본문 폭과 같음), 360·390에서는 44px 그대로 |
| 3 `/adapt` | [P3] 섹션 칩 줄 | 수정 | `role="group"`, 오른쪽에 칩이 더 있으면 흐림(끝까지 넘기면 사라짐, 카테고리 바꾸면 다시 잼), 마우스 기기에는 얇은 스크롤바. 표의 흐림 로직을 `useMoreToRight`·`RightFade`로 빼서 표와 같이 씀 |
| 3 `/adapt` | [P3] 가로 모드 노치 | 수정 | 헤더·하단 탭 좌우 `env(safe-area-inset-*)`, 본문 `max(16px, env(...))`. 헤드리스 브라우저는 노치 값을 흉내 낼 수 없어 실기기 확인 필요(값이 0일 때 기존과 같은 16px는 확인) |
| 3 `/adapt` | (신규) 모든 화면이 옆으로 1px 밀림 | 수정 | 검색 버튼의 눌림 표시(Montage with-interaction)가 44px 터치 영역 밖으로 0.5px 나감(HEAD 빌드에서도 재현). 헤더에 `overflow-x: clip`(sticky 영향 없음) → 320·390·768·1440 × 4개 화면 모두 가로 넘침 0 |
| 4 `/optimize` | [P2] JS 한 덩어리 | 수정 | 오늘 탭만 첫 로드, 나머지 5개 화면 `React.lazy`. 첫 화면 JS **228KB → 150KB(gzip, -34%)**. 마크다운 렌더러는 상세 화면 덩어리(61KB)로 이동. `sectionId`·`idFromHash`를 `section.ts`로 빼서 검색 화면이 렌더러를 끌고 오지 않게 함. 첫 화면이 뜬 뒤 한가할 때 나머지 화면 코드를 미리 받음. 화면 이동은 React Router의 startTransition으로 이전 화면 유지(빈 화면 없음). 13개 덩어리 모두 SW precache 포함 |
| 4 `/optimize` | [P2] 글꼴 CSS 렌더링 차단 | 수정 | `rel=preload as=style` + onload에서 stylesheet로 전환. 측정: 첫 방문 Google Fonts CSS 375ms(새 연결) vs 앱 JS 275ms+다운로드. 두 CSS 모두 이미 `font-display: swap`이라 글꼴 바뀌는 시점은 같음. Pretendard·Hahmlet 모두 적용 확인 |
| 5 `/typeset` | [P3] 글자 크기·간격 숫자 흩어짐(F14) | 수정 | `layout.tsx` `SERIF_TYPE`(제호·기온·말씀·지면 번호)로 세리프 정체성 글자를 한곳에. 크기는 Montage 변형과 같은 rem(36→2.25rem 등)이라 기기 글자 크기 설정을 따름. 오늘 탭·상세 화면에 따로 있던 말씀 글자 정의를 하나로 합침. 기온의 `fontSize: 24`는 `title3`과 겹친 중복이라 제거. 지면 머리글 2곳은 `SectionLabel`로, 반복되는 간격 6은 `DOT_LABEL_GAP`·`CHIP_GAP`으로 이름 붙임. `SERIF`는 더 이상 내보내지 않음(세리프는 `SERIF_TYPE`으로만). 화면 모양 변화 없음: 계산된 값(36/41.4px, 24/28.8px, 18/32.4px, 15px, 12/16px)이 전과 같음 |
| 6 `/polish` | 마무리 점검 | 완료 | 코드: `layout.tsx` 중간에 끼어 있던 import를 위로, 엉뚱한 자리의 `SCROLL_MARGIN` 설명을 제자리로, `CHIP_MAX` 설명(6자→12자) 바로잡음. console·TODO·any 없음. 화면: 다크(지난 브리핑·상세·모아보기·검색)·라이트, 폭 320·390·768·1440에서 어긋남 없음. 링크 행 키보드 포커스 2px primary 외곽선, 넓은 화면에서 헤더·탭·칩 줄·본문이 680px 열에 정렬 |

### 정리

- 감사 12건 중 12건 수정, 점검 중 새로 찾은 문제 2건(검색 결과 섹션 제목 가림, 가로 1px 밀림)도 수정
- 테스트 66개 통과(테스트 코드는 import 경로 1줄만 바뀜), 타입 체크 통과, 콘솔 오류 0
- 첫 화면 JS 228KB → 150KB(gzip)
- 실기기로 확인할 것: 가로 모드 노치 여백(iPhone), 다크 모드 설치 앱 스플래시(브라우저 제약으로 흰색 유지)
- Montage 내부 컴포넌트(세그먼트·탭 비선택 글자, 검색창 보조 글자)는 여전히 `label.alternative`(3.7:1). 덮어쓸지는 별도 결정

- 남은 것: Montage 내부 컴포넌트(세그먼트·탭의 비선택 항목, 검색창 보조 글씨)도 `label.alternative`를 쓴다. Montage를 덮어쓰지 않는다는 원칙에 따라 이번 범위에서 뺐다.
- manifest는 다크용 `background_color`를 따로 둘 수 없어, 다크 모드에서 설치 앱 스플래시는 여전히 흰색이다(브라우저 제약).
- 간격을 4/8 배수로 강제로 맞추지는 않았다. 화면이 바뀌고, 지금 값들은 역할 안에서는 이미 일관됐다. 반복되는 역할에 이름만 붙였다.
- 실행 중 테마 토큰은 hex가 아니라 `var(--…)` 문자열이다. 투명도를 바꿀 때 `addHexOpacity`가 아니라 `addOpacity`를 써야 한다(처음 `addHexOpacity`로 했다가 색이 깨지는 것을 빌드본에서 발견하고 바꿈).

---

## 재감사 (같은 날, 커밋 bef4228 배포 후)

방식이 처음과 다르다. 처음에는 앱 코드에 적힌 토큰 값만 계산했다. 이번에는 빌드본을 라이트·다크 × 7개 화면으로 띄워 **화면에 그려진 모든 글자**의 대비와 터치 영역을 쟀다. 그래서 Montage 컴포넌트가 내부에서 쓰는 색까지 잡혔다. 루트 글자 크기 150%·200%도 시험했다.

| # | 영역 | 처음 | 지금 | 핵심 발견 |
|---|---|---|---|---|
| 1 | 접근성 | 3 | 3 | 앱 코드의 글자는 대비 미달 0건. Montage 내부 비활성 색이 미달(탭 1.68:1, 하단 탭 2.78:1) |
| 2 | 성능 | 3 | 3 | 첫 화면 JS 150KB로 줄었음. 검색 데이터 1.43MB(gzip 428KB)가 매일 통째로 바뀜 |
| 3 | 반응형 | 3 | 3 | 가로 넘침 0(320~1440). 글자 200%에서 하단 탭 라벨이 잘림 |
| 4 | 테마 | 3 | 4 | 모든 색이 토큰, 다크 첫 화면 해결 |
| 5 | 안티패턴 | 4 | 4 | — |
| **합계** | | **16** | **17/20** | **Good** |

### 발견 (P0 0 · P1 2 · P2 5 · P3 2)

**[P1] 상세 화면 카테고리 탭(선택 안 됨) 대비 1.68:1**
- 위치: [Day.tsx](../app/src/routes/Day.tsx) `TabList`. Montage tab 스타일이 비선택 글자에 `label.assistive`(28%)를 씀
- 측정: 라이트 1.68:1, 다크 1.79:1(15px). 기준 4.5:1
- 영향: 다른 카테고리로 가는 주 이동 수단인데 글자가 거의 안 보인다
- 기준: WCAG 1.4.3
- 권장: `sx`로 `[aria-selected='false'] [data-role='tab-list-item-text']` 색을 `metaColor`로
- 명령: `/normalize`

**[P1] 하단 탭(선택 안 됨) 대비 2.78:1**
- 위치: [layout.tsx](../app/src/layout.tsx) `BottomNavigation`. Montage가 `interaction.inactive`(#989BA2 / 다크 #5A5C63)를 씀
- 측정: 라이트 2.78:1, 다크 2.40~2.55:1(12px). 모든 화면에 항상 보인다
- 기준: WCAG 1.4.3
- 권장: 이미 글자 크기를 덮어쓰는 `sx`에 비선택 색도 `metaColor`로
- 명령: `/normalize`

**[P2] 세그먼트(선택 안 됨) 대비 3.5:1**
- 위치: 모아보기 액션/종목, 설정 화면 모드. Montage `label.alternative`
- 측정: 라이트 3.52:1, 다크 3.16~3.28:1(13px)
- 명령: `/normalize`

**[P2] 다크 모드 달력 선택 날짜 대비 3.54:1**
- 위치: [Calendar.tsx](../app/src/routes/Calendar.tsx) 날짜 버튼. 흰 글자 on `primary.normal` 다크(#3385FF). 라이트는 4.83:1로 통과
- 권장: 다크에서는 선택 배경을 한 단계 진한 primary로, 또는 글자를 `static.black` 계열로
- 명령: `/normalize`

**[P2] 검색 데이터가 크고 매일 통째로 바뀜**
- 위치: [scripts/build-data.ts:42](../app/scripts/build-data.ts#L42) 반기별 `search-YYYYH[12].json`
- 측정: 99일치 1.43MB(gzip 428KB), 하루 약 14KB씩 증가. 12월 말 약 2.5MB(gzip 약 750KB). 새 브리핑이 올라올 때마다 파일 전체가 바뀌어 검색을 열 때마다 다시 받는다(SWR이라 뒤에서). 첫 검색은 다 받을 때까지 결과가 없다. 검색 자체는 문서 3,106개에 평균 4.2ms로 빠름
- 권장: 월별 파일로 나눠 지난달 파일은 바뀌지 않게(캐시 유지). `index.json`(124KB, 하루 약 1.25KB 증가)도 같은 방향을 검토
- 명령: `/optimize`

**[P2] Montage 내부 영어 라벨**
- 위치: 오늘 탭 설치 안내 `SectionMessage`의 닫기 버튼 "Close message", 아이콘 "info". 알림 영역 "Notifications"
- 영향: 한국어 화면에서 스크린 리더가 영어로 읽는다. 닫기는 누르는 버튼이라 특히 어색하다
- 기준: WCAG 3.1.2 Language of Parts
- 권장: `closeButton` 대신 한국어 라벨의 닫기 버튼을 `trailingButton` 옆에 직접 둔다
- 명령: `/harden`

**[P2] 글자 200%에서 하단 탭 라벨이 잘림**
- 위치: [layout.tsx](../app/src/layout.tsx) `BottomNavigation`(높이 57px 고정)
- 측정: 루트 글자 200%에서 "지난 브리핑"이 "지난 브리 / 핑"으로 줄바꿈되고 둘째 줄이 잘림. 본문·헤더·상세 탭은 늘어나 문제없음
- 기준: WCAG 1.4.4 Resize Text
- 권장: 라벨 `white-space: nowrap` + 크기 상한(`min(0.75rem, 14px)` 등), 또는 하단 탭 높이를 내용에 맞춤
- 명령: `/adapt`

**[P3] 큰 글자에서 제호가 단어 중간에서 줄바꿈**
- 위치: [Today.tsx](../app/src/routes/Today.tsx) 제호. 200%에서 "데일리 브리 / 핑"
- 권장: `SERIF_TYPE.masthead`에 `wordBreak: 'keep-all'`
- 명령: `/typeset`

**[P3] Montage 컴포넌트의 터치 영역 44px 미만**
- 달력 이전·다음 달 24×24, 세그먼트 높이 28, 상세 탭 높이 40(“투자” 폭 26), 설정 버튼 28~32
- WCAG 2.5.8(24px)은 통과, `.impeccable.md` 원칙 4(44px)는 미달
- 명령: `/adapt`

### 반복되는 문제

- **Montage의 "비활성" 색 4가지가 대비 기준을 못 넘는다.** `label.assistive`(탭), `interaction.inactive`(하단 탭), `label.alternative`(세그먼트·검색창), 다크 `primary` 위 흰 글자. 앱 코드는 1단계에서 고쳤지만 Montage 컴포넌트 안은 그대로다. "Montage를 거스르지 않는다"와 "대비 4.5:1"(원칙 5)이 부딪히는 지점이라 하나를 정해야 한다. 덮어쓰기로 하면 컴포넌트마다 흩지 말고 한 곳(전역 스타일 한 모듈)에 모으는 게 낫다.
- **데이터 파일이 날짜에 비례해 커진다.** 검색(1.43MB)과 목록(124KB)이 매일 통째로 바뀐다. 지금은 괜찮지만 1년이면 3~4배다.

### 잘된 점(처음 감사 이후)

- 앱 코드가 그린 글자는 라이트·다크 7개 화면에서 대비 미달 0건
- 7개 화면 모두 1단계 제목, 목록 행은 진짜 링크, 키보드 포커스 외곽선
- 폭 320·390·768·1440 모두 가로 넘침 0, 글자 200%에서도 본문·헤더·상세 탭은 늘어남
- 첫 화면 JS 228 → 150KB, 나머지 화면은 한가할 때 미리 받기, 오프라인 precache
- 색 하드코딩 0(첫 화면 전 `index.html`의 배경 2개는 이유를 적어 둠)

### 권장 순서

1. **[P1] `/normalize`**: 상세 탭·하단 탭·세그먼트의 비활성 색, 다크 달력 선택 날짜. Montage 덮어쓰기를 전역 한 곳에 모을지 먼저 정한다
2. **[P2] `/harden`**: 설치 안내 닫기 버튼 한국어 라벨
3. **[P2] `/adapt`**: 글자 200%에서 하단 탭 라벨, Montage 컴포넌트 터치 영역
4. **[P2] `/optimize`**: 검색 데이터 월별 분할
5. **[P3] `/typeset`**: 제호 keep-all
6. **`/polish`**

### 재감사 수정 결과

| 단계 | 항목 | 상태 | 확인 |
|---|---|---|---|
| 1 `/normalize` | [P1] 상세 탭·하단 탭 비선택, [P2] 세그먼트, 검색창 안내 문구 | 수정 | Montage 덮어쓰기를 `src/montage-overrides.ts` 한곳에 모아 전역 스타일에 연결(`html` 접두로 우선순위 확보). 탭·하단 탭·검색창은 `metaColor`, 세그먼트는 밝은 트랙 위라 `label.neutral`(metaColor로는 다크 3.9:1). 상세 탭은 호버 시 진해지는 동작 유지. 검색창 안내 문구(1.68:1)는 재감사 스캔이 텍스트 노드만 봐서 놓쳤던 것을 함께 수정. 빌드본 라이트·다크 6개 화면 스캔에서 대비 미달 0 |
| 1 `/normalize` | [P2] 다크 달력 선택 날짜 | 수정 | 다크에서만 `primary.heavy`(#0066FF, 4.83:1). 라이트는 그대로 |
| 2 `/harden` | [P2] Montage 영어 라벨 | 수정 | `montage-overrides.ts` `localizeMontageLabels`: Montage가 고정한 영어 라벨 7개(Close message·Close snackbar·Notifications·info·positive·negative·cautionary)를 한국어로. 토스트·스낵바처럼 나중에 생기는 요소도 MutationObserver로 잡음(동적 삽입 시험으로 확인). 정확히 같은 문자열만 바꿔 앱 라벨은 그대로. 6개 화면 영어 라벨 0 |
| 2 `/harden` | (신규) 설치 안내가 `role="alert"` | 수정 | 열 때마다 스크린 리더가 끼어들어 읽던 것을 `role="note"`로(Montage가 props로 허용) |
| 2 `/harden` | (신규) 설치 안내 문구가 h2 제목 | 수정 | 제목 역할만 뺌(`role="none"`). 접근성 트리에서 오늘 탭 제목이 제호(1) → 헤드라인·오늘의 지면(2)으로 정리됨 |
| 3 `/adapt` | [P2] 글자 200%에서 하단 탭 라벨 잘림 | 수정 | Montage 고정 높이(56px)를 `minHeight`로 바꾸고 `--nav-h`로 본문 아래 여백이 따라가게(헤더 `--header-h`와 같은 `useHeightVar`). 항목 아래 여백 4px로 기본 크기는 예전과 같은 57px. 라벨 `keep-all`로 "지난 / 브리핑". 100·150·200%에서 잘린 라벨 0, 본문 끝과 하단 탭 사이 항상 24px |
| 3 `/adapt` | [P3] Montage 터치 영역 | 수정 | `elementFromPoint`로 44px 가장자리를 실제로 찍어 확인. 달력 이전·다음 달 `TOUCH_44`, 세그먼트는 안쪽 글자 span에 `::after`(항목은 ::before·::after를 모양에 씀), 작은 버튼은 높이별 `hitY(h)`(`CHIP_HIT`=32, `TEXT_BUTTON_HIT`=28). 상세 탭은 스크롤 영역이 세로로 잘라 가상 요소가 안 먹어 `--wds-tab-padding-y` 12px(46px, 아래 2~3px은 Radix 스크롤바가 덮어 실효 약 44px), 좌우는 `::before`로 간격 절반씩. 화면 변화: 상세 탭 줄 +6px, 달력 달 제목과 필터 사이 +8px |
| 3 `/adapt` | (신규) 달 이동 버튼과 필터 칩의 눌리는 영역이 8px 겹침 | 수정 | 화살표 바로 아래를 누르면 필터 "전체"가 눌렸다. 달 제목 줄 아래 여백 10px + 필터 줄 위 여백 6px로 분리 |
| 3 `/adapt` | (신규) 가로 스크롤 줄의 칩 눌리는 영역이 위에서 잘림 | 수정 | `overflow-x: auto`는 세로도 잘라 달력 필터 칩의 위쪽 6px이 안 눌렸다. 필터 줄 위 여백 6px |
| 3 `/adapt` | (회귀) 설치 안내 닫기 버튼이 20px로 돌아감 | 수정 | 2단계에서 라벨을 "안내 닫기"로 바꾸며 F8의 선택자 `aria-label="Close message"`가 빗나감. `data-role`로 바꿈. 닫기의 눌림 표시가 "방법 보기" 오른쪽 4px을 덮어 왼쪽 여백만 -8px로(아이콘 위치 그대로) |
| 4 `/optimize` | [P2] 검색 데이터가 매일 통째로 바뀜 | 수정 | `build-data.ts`: 반기 파일 → 월별 + 내용 해시 이름(`search-2026-09.e5f48968.json`). 배포가 매일 모든 파일을 새로 써서 같은 이름은 서버 캐시 검증을 믿을 수 없기 때문. SW는 해시 파일을 `briefing-search`에 CacheFirst(최대 40개). 측정: 100일치 1412KB 한 파일 → 7월 99KB·8월 132KB·9월 157KB·10월 36KB(gzip). 매일 다시 받는 양은 이번 달 파일 하나(월말에도 약 150KB 이하). 새 파일 4개를 이어 붙인 결과가 이전 파일과 문서 3,138개 순서·내용까지 같음, 같은 데이터로 두 번 빌드해도 이름 같음, 두 번째 검색은 4개 모두 SW 캐시(전송 0). 테스트 2개 추가(66→68) |

- 남은 것: `index.json`(123KB, 하루 약 1.25KB 증가)은 앱을 열 때마다 재검증하고 새 브리핑이 오면 통째로 다시 받는다. 지금 크기에서는 문제가 아니라 그대로 둠. 1년 뒤 약 450KB가 되면 최근 N일만 담고 나머지를 월별로 빼는 방식을 검토.
| 5 `/typeset` | [P3] 큰 글자에서 제호가 단어 중간 줄바꿈 → 앱 전체 문제로 확대 | 수정 | 글자 위치로 줄바꿈 지점을 찾는 검사를 7개 화면 × 100·200%에 돌림. 제호뿐 아니라 상세 본문("끌|고")·달력 미리보기 헤드라인("역|대")·모아보기 액션("실적|에서")·설정 안내("누르세|요")·설치 안내("열려|요")까지 기본 크기에서도 단어 중간에서 끊겼다. 오늘 탭 일부에만 `keep-all`을 따로 붙이고 나머지는 기본값이었던 탓. 전역 `word-break: keep-all` + `overflow-wrap: break-word`(Montage ListCell과 같은 조합)로 바꾸고 개별 `keep-all` 4곳 제거. 재검사에서 단어 중간 끊김 0(남은 건 URL·코드처럼 공백 없이 긴 문자열이 폭을 넘을 때뿐) |
| 5 `/typeset` | (회귀) 달력 화면이 옆으로 2px 밀림 | 수정 | 3단계에서 달 이동 버튼에 `TOUCH_44`를 붙이며 Montage 눌림 표시가 화면 밖으로 나감. 헤더처럼 `main`에도 `overflow-x: clip`. 320·390·768·1440 × 6개 화면 가로 넘침 0, 모아보기 sticky 날짜 제목 정상 |
| 6 `/polish` | 마무리 점검 | 완료 | 코드: import 순서, `montage-overrides.ts` 머리 설명(터치 영역 추가)·탭 높이 설명(44→46px) 바로잡음. console·TODO·any 없음. **회귀 전체 재확인**(새 빌드, SW·캐시 비운 상태): 대비 미달 0·영어 라벨 0(라이트·다크 × 7화면), 7화면 1단계 제목, 터치 13곳 × 4방향 정상, 하단 탭 100/150/200%(57/65/105px, 잘림 0, 본문 간격 24px), 가로 넘침 0(320·390·768·1440 × 6화면), 단어 중간 줄바꿈 0, 검색 파일 4개 SW 캐시, 첫 감사 항목(검색→섹션 top 163 = 헤더 151+12, 칩 흐림, `li > a`, 포커스 외곽선, 다크 첫 화면) 유지, 콘솔 오류 0 |

### 재감사 정리

- 재감사 9건(P1 2·P2 5·P3 2) 모두 수정. 점검 중 새로 찾은 문제 5건(설치 안내 `role="alert"`·h2, 검색창 안내 문구 대비, 달 이동/필터 터치 겹침, 가로 스크롤 줄 칩 영역 잘림, 앱 전체 단어 중간 줄바꿈) 수정
- 수정 중 생긴 회귀 2건(닫기 버튼 터치 영역, 달력 가로 2px)을 다음 단계 점검에서 찾아 수정. 마지막에 전 항목 일괄 재확인
- Montage 우회는 `src/montage-overrides.ts` 한곳(색·터치·라벨·SectionMessage 역할). Montage를 올리면 이 파일의 선택자부터 확인
- 화면 변화: 비활성 탭·하단 탭·세그먼트 글자가 진해짐, 상세 탭 줄 +6px, 달력 달 제목과 필터 사이 +8px, 본문 줄바꿈이 단어 단위로, 설치 안내 "방법 보기" 4px 왼쪽
- 테스트 66 → 68
- 실기기로 확인할 것: 가로 모드 노치 여백, 다크 설치 앱 스플래시(흰색 유지, 브라우저 제약), 안드로이드 글자 크기 설정에서 하단 탭
