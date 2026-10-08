# Design Audit — hgko1207.github.io/daily-news (2026-10-08)

대상: 배포본 https://hgko1207.github.io/daily-news/ (커밋 14305fb). 드라이버: gstack 헤드리스 브라우저(Aside 없음, Windows).
뷰포트: 390×844(주), 768×1024, 1440×900. 라이트/다크. 촬영 시각 KST 09:1x(10시 전 상태 확인).
화면 분류: 오늘·상세 = READ, 지난 브리핑·모아보기·검색·설정 = OPERATE.
외부 의견: Codex 미설치. Claude 서브에이전트 소스 일관성 감사(in-host)만 완료.

## 점수
- **Design Score: B-**
- **AI Slop Score: A** — 카드 더미·그라데이션·이모지 장식 없음. Montage 기본값 위에 차분한 읽기 화면.

| 카테고리 | 등급 | 근거 |
|---|---|---|
| Visual Hierarchy | B+ | 오늘 탭 헤드라인 1순위 명확. 10시 전 안내가 약함(F6) |
| Typography | B | 하단 탭 11px(F9), 칩 말줄임(F13) |
| Spacing & Layout | B | 섹션 이동 시 제목 가림(F5), 표 잘림(F11) |
| Color & Contrast | B+ | assistive 4곳 잔존(F7) |
| Interaction States | D | 검색 이동 고장(F1), 닫기 버튼 오동작(F2), 터치 영역(F8), 뒤로가기 불일치(F12) |
| Responsive | B- | 넓은 화면에서 크롬 전체 폭(F4), 탭 첫 항목 잘림(F10) |
| Content | B | 액션 87개 평면 목록·색만 구분(F3) |
| AI Slop | A | — |
| Motion | B | 별도 연출 없음(설계상 의도), reduced-motion 처리됨 |
| Performance Feel | A- | JS gzip 224KB, 콘솔 오류 없음 |

## 첫인상
이 앱은 **"오늘 무슨 일이 있었는지 한눈에"**를 잘 전달해요. 눈이 가장 먼저 가는 곳은 ① 28px 헤드라인, ② 파란 설치 안내 줄, ③ 색 점이 붙은 카테고리 라벨이에요. 의도한 위계와 거의 맞아요. 다만 지금은 오전 9시라 화면은 10/7 브리핑인데, 이를 알려주는 "오늘 브리핑은 10시쯤 도착해요"는 헤드라인 위 세 번째 줄에 12px 회색으로 묻혀 있어요. 한 단어로: **차분함**.

## Trunk test
오늘 PASS · 상세 PASS · 지난 브리핑 PASS · 모아보기 PARTIAL(종목 상세에서 위치 표시 약함) · 검색 PASS · 설정 PASS

## Goodwill
```
Goodwill: 60 ██████████████████░░░░░░░░░░░░
  앱 열기 → 헤드라인 바로 보임        70 → 80 (+10 핵심 정보가 첫 화면)
  10시 전, 어제 날짜를 늦게 알아챔      80 → 75 (-5 모호함)
  설치 안내 X → 설정 화면으로 튐       75 → 65 (-10 예상과 다른 동작)
  검색 결과 탭 → 엉뚱한 섹션           65 → 55 (-10)
  모아보기 액션 87개 평면 목록          55 → 60 (+5 체크 저장은 잘 됨, -0)
  FINAL: 60/100 (보통)
```

## Findings

### HIGH
- **F1 [interaction] 검색 결과를 누르면 엉뚱한 섹션으로 감.** "반도체 업황" 결과 → "관심 종목·국내" 위치(이전 스크롤 복원값). 원인: 섹션 id는 인코딩 문자열인데 이동 코드가 디코딩해서 찾음. `###` 헤딩(예: "국내")은 id가 아예 없고, Enter 키로 열면 해시가 빠짐. 증거: search-v.png, search-jump.png
- **F2 [interaction] 설치 안내의 X를 누르면 설정 화면으로 이동.** 안내 줄 전체에 onClick이 걸려 닫기 클릭이 위로 전달됨. 키보드로는 링크 동작 불가. 증거: 실행 확인(location.hash = #/settings#install)
- **F3 [content/color] 모아보기 액션 87개가 날짜 구분 없이 한 줄로 나열되고, 카테고리는 색 점으로만 구분(라벨 없음).** 색만으로 정보 전달 = 접근성 위반. 증거: collect-v.png, collect-actions.png
- **F4 [responsive] 넓은 화면에서 헤더·하단 탭·툴바가 전체 폭으로 퍼짐.** 1440px에서 탭 4개가 360px 간격, 검색 아이콘이 화면 끝. 본문 680px 열과 정렬 안 됨. 증거: desktop-today.png, tablet-day.png

### MEDIUM
- **F5 [layout] 섹션 칩·검색 이동 시 제목이 고정 헤더(145px)에 가려짐.** scroll-margin 120px. 증거: day-invest-tickers.png
- **F6 [hierarchy] 10시 전 안내가 약함.** 날짜는 "10월 7일 수요일"인데 오늘이 아니라는 신호가 12px 회색 세 번째 줄뿐. 증거: today-full.png
- **F7 [color] `label.assistive`(28%) 4곳 잔존:** 말씀 라벨, 달력 요일, 완료 액션, 종목코드. D14 대비 기준 미달.
- **F8 [interaction] 터치 영역 44px 미만:** 검색 24×24, 안내 닫기 20×20, 날짜 ‹ › small, 섹션 칩 높이 32.
- **F9 [typography] 하단 탭 라벨 11px** (기준 12px 이상).
- **F10 [responsive] 상세 카테고리 탭 첫 항목이 왼쪽에서 잘림**(폰·태블릿 모두). 증거: day-invest-table.png, tablet-day.png
- **F11 [layout] 표 마지막 열("출처")이 잘리고 옆으로 밀 수 있다는 표시가 없음.** 헤더 첫 칸만 배경색이 다름. 증거: day-invest-table.png
- **F12 [interaction] 뒤로가기 방식 불일치:** 상세는 항상 오늘로, 검색은 브라우저 뒤로(-1), 종목 상세는 본문 안 "‹ 종목 목록" 텍스트 버튼. 증거: ticker-v.png
- **F13 [typography] 섹션 칩 라벨이 단어 중간에서 잘림**("관심 종목 …", "오늘의 한 …"). 증거: day-word.png

### POLISH
- **F14** 같은 역할에 다른 타이포(목록 요약 body2 vs body2-reading, 종목 제목 body1), 간격이 4/8 배수 체계가 아님(6, 10, 28 등).
- **F15** h1 없음(헤더 제목·헤드라인·안내가 모두 h2), 로딩·빈 상태 표현이 화면마다 다름.

## Quick Wins (각 30분 이내)
1. F2 닫기 버튼 오동작(안내 문구만 링크로)
2. F1 섹션 id 매칭 + `###` id + Enter 해시
3. F5 scroll-margin을 헤더 높이에 맞춤
4. F7·F9 assistive → alternative, 탭 라벨 12px
5. F8 검색·닫기 버튼 44px 터치 영역

## 외부 의견 (Claude 서브에이전트, 소스 일관성)
색은 Montage 시맨틱 토큰으로 통일. 간격·타이포 역할·내비게이션·상태 표현은 화면마다 따로 감. F2(이벤트 전파), F3(색만 구분), F4(크롬 전체 폭), F7, F8, F12, F14, F15가 소스에서도 확인됨.

---

## 수정 결과 (Phase 8~10, 2026-10-08)

| Finding | 상태 | 커밋 | 확인 |
|---|---|---|---|
| F1 검색 결과 이동 | verified | 27863c6 | "반도체 업황"·"국내" 결과 모두 해당 섹션 도착, 회귀 테스트 5개 |
| F2 안내 닫기 오동작 | verified | 869550c | X → 오늘 화면 유지, "방법 보기" → 설정 |
| F3 액션 목록 | verified | 14828a7 | 날짜별 그룹(고정 날짜 제목), 카테고리 라벨, `[ ]` 제거 + 테스트 |
| F4 넓은 화면 정렬 | verified | 749dd8e | 1440·768에서 헤더·탭·하단 탭이 680px 열에 정렬 |
| F5 제목 가림 | verified | 229fb25 | 칩 이동 후 제목 top 157px(헤더 145px 아래) |
| F6 10시 전 안내 | verified | bd98004 | 날짜 옆 "어제 브리핑" 배지 + 안내 문구 |
| F7 assistive 대비 | verified | 0635868 | 4곳 → alternative |
| F8 터치 영역 | verified | 27da1f3, ea70e0a | 헤더·날짜·닫기 44×44, 칩·텍스트 버튼 히트 영역 확대. 후속 커밋으로 아이콘 정렬 회귀 수정 |
| F9 하단 탭 라벨 | verified | cc70150 | 12px |
| F10 탭 잘림 | verified | ea70cda | 첫 탭 16px 안쪽, 선택 탭 자동 스크롤 |
| F11 표 잘림 | verified | 79a721f | 표 599px 자연 폭, 오른쪽 흐림 표시, 헤더 첫 칸 배경 일치 |
| F12 뒤로가기 | verified | cd23cc0 | 직접 진입 → 상위 화면, 앱 내 이동 → 이전 화면 |
| F13 칩 말줄임 | verified | 086d731 | "관심 종목 촉매", "함께 읽으면 좋은 구절" 전체 표시 |
| F14 타이포·간격 체계 | deferred | — | /design-consultation으로 DESIGN.md 만들 때 정리 |
| F15 헤딩 구조·상태 표현 | deferred | — | 같은 단계 |
| **F16 (신규) label.alternative 대비 약 3.7:1** | **deferred (결정 필요)** | — | 렌더 색 rgba(55,56,60,0.61) on #FFF. WCAG AA 4.5:1 미달. Montage 관례와 충돌 |

- 총 16건(원래 15 + 감사 중 발견 1), 수정 13건(모두 verified), 보류 3건, 되돌림 0건
- 콘솔 오류: 수정 전 0(의도된 404 제외) → 수정 후 0
- 테스트: 52 → 57
- Design Score: B- → **A-** (계산값 3.64/4.0)
- AI Slop Score: A → A
- Detector: not installed

> PR 한 줄 요약: "Design review found 16 issues, fixed 13. Design score B- → A-, AI slop score A → A."
