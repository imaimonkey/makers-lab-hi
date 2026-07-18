# 핵심 플랫폼

## 라우팅

라우팅의 단일 진입점은 `src/app/router.tsx`다.

| 경로 | 페이지 | 소유 영역 |
| --- | --- | --- |
| `/` | `RiskDashboardPage` | 1 대시보드 |
| `/risks` | `RiskCatalogPage` | 2 후보 목록 |
| `/risks/:riskId` | `RiskDetailPage` | 3 상세 평가 |
| `/reports` | `ReportsPage` | 4 리포트 |
| `/customer-insight` | `CustomerInsightPage` | 5 고객 루프 |

`RootLayout`은 실무자 전용 사이드바, 상단 사용자 맥락, 비공식 프로토타입 고지를 제공한다. `CustomerLayout`은 공개 웹 형태의 헤더, 고객용 탐색 내비게이션, 별도 푸터를 제공한다. 두 셸은 `ModeSwitch`로 왕복하지만 고객 앱은 실무자 좌측 메뉴에 포함하지 않는다.

## 계층 책임

- `app`: 앱 초기화, 레이아웃, 라우팅
- `pages`: 경로 단위 기능 조합과 URL 파라미터 처리
- `features`: 사용 사례 로직과 기능 UI
- `domain`: 페이지에 독립적인 엔터티, 계약, 카탈로그, 저장 어댑터
- `shared`: 도메인을 모르는 공통 UI와 설정
- `styles`: 전역 토큰과 현재 프로토타입 표현

의존 방향은 `app/pages → features → domain`, 공통 표현은 각 계층에서 `shared`를 사용할 수 있다. `domain`이 `pages`나 `features`를 가져오지 않는다.

## 상태 관리

현재 고객 입력과 화면 필터는 React 로컬 상태다. 비식별 고객 신호만 `customerSignalStorage.ts` 어댑터를 통해 `localStorage`에 저장한다. 새 전역 상태 라이브러리를 추가하기 전에 서버 상태, URL 상태, 폼 상태, 세션 상태 중 무엇인지 먼저 분류한다.

운영 데이터에는 TanStack Query 같은 서버 캐시 도구를 검토할 수 있으나, API 오류·재시도·권한·데이터 최신성 계약이 먼저다. 고객 민감정보를 클라이언트 영구 저장소에 넣지 않는다.

## 접근성·반응형

- `:focus-visible`, 의미 있는 폼 레이블, 버튼 상태를 유지한다.
- 색만으로 상태를 전달하지 않는다.
- 작은 화면에서는 사이드바가 상단 내비게이션으로 전환된다.
- 고객 화면은 별도 공개 웹 헤더와 검색형 히어로를 유지하고 모바일에서는 핵심 전환·입력 동작을 우선한다.
- 표에는 작은 화면 대체 뷰 또는 가로 스크롤 전략을 제공한다.
- `prefers-reduced-motion`을 존중한다.
