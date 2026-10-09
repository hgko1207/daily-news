# 모바일 앱 (PWA)

브리핑을 폰 홈 화면에 추가해 앱처럼 보는 뷰어입니다. 배포 주소: https://hgko1207.github.io/daily-news/

## 로드맵

**v1 · 모바일 앱 (PWA)** ✅ [배포됨](https://hgko1207.github.io/daily-news/): 폰 홈 화면에 추가해 앱처럼 보는 브리핑 뷰어
- 오늘: 아침 신문 1면처럼 구성한 화면
  - 제호 "데일리 브리핑"과 호수(그날까지 나온 브리핑 수)
  - 내 위치 날씨: 출근(8시)·점심(12시)·퇴근(18시) 기온과 하늘, 비 확률, 우산·겉옷 안내. 19시부터는 내일 날씨. [Open-Meteo](https://open-meteo.com) 예보를 쓰고, 위치는 이 기기에만 저장합니다.
  - 오늘의 헤드라인과 "전문 읽기", 카테고리별 핵심 한 줄을 번호 목차("오늘의 지면")로
  - 맨 아래 오늘의 말씀
- 지난 브리핑: 달력으로 날짜 이동
- 모아보기: 날짜를 가로질러 ✅ 액션, 관심 종목 언급 타임라인
- 검색: 종목·키워드 검색
- 설정: iPhone(Safari) / Android(Chrome) 설치 안내, 라이트·다크 테마
- 스택: Vite + React + [원티드 디자인 시스템 Montage](https://github.com/wanteddev/montage-web), GitHub Actions → GitHub Pages 자동 배포
- 앱 코드는 `app/` 폴더에 두고, 카테고리 폴더는 스케줄러만 수정합니다.
- 디자인: Montage를 기반으로 쓰고, 제호·지면 번호·날씨 기온·말씀에만 세리프(Hahmlet)를 더했습니다. 기준은 [.impeccable.md](../.impeccable.md)
- 설계 문서: [docs/design-mobile-pwa.md](../docs/design-mobile-pwa.md), 오늘 탭 개편 기록: [docs/design-today-redesign-2026-10-08.md](../docs/design-today-redesign-2026-10-08.md)

**v1.1**: 실적·매크로 일정 모아보기, 글자 크기 설정

**v2**: 브리핑과 함께 구조화된 JSON을 남겨서, 브리핑의 예측(예: 실적 컨센서스)을 실제 결과와 비교하는 "채점" 기능

## 개발

```bash
gh auth refresh -h github.com -s read:packages   # 처음 한 번: 원티드 패키지(GitHub Packages) 읽기 권한
export NODE_AUTH_TOKEN=$(gh auth token)
npx pnpm@9 install
npx pnpm@9 build:data   # 브리핑 md → public/data/*.json
npx pnpm@9 dev          # http://localhost:5173/daily-news/
npx pnpm@9 test         # 파서·검색·날짜·날씨 로직 테스트
```

배포: `main`에 push하면 GitHub Actions(`.github/workflows/deploy.yml`)가 데이터와 앱을 빌드해 GitHub Pages에 올립니다. 스케줄러가 매일 커밋할 때도 자동으로 다시 배포돼요.
- 원티드 패키지는 기본 `GITHUB_TOKEN`으로 설치됩니다(2026-10-07 첫 배포에서 확인). 막히면 `read:packages` PAT를 Secrets의 `WDS_PACKAGES_TOKEN`으로 등록하면 우선 사용돼요.
- Settings → Pages → Source: GitHub Actions
