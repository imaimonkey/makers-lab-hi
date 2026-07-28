# 0728 기능 브랜치 재통합 기록

기준 브랜치: `0723-backup`

기준일: 2026-07-28

## 목적

`otherstatus/` 아래의 기능 브랜치는 공통 베이스에서 갈라진 뒤 각 담당 기능을 수직적으로 계속 개발했다. 따라서 이 작업은 브랜치 전체를 덮어쓰는 방식이 아니라, 최신 기능별 계약과 상호작용을 현재 안정 경로와 공통 도메인 구조에 다시 수용하는 방식으로 진행한다.

비교한 로컬 브랜치 상태는 다음과 같다.

| 기능 브랜치 | 비교 커밋 | 통합 소유 영역 |
| --- | --- | --- |
| `hyoje` | `0cf6429` | 위험 레이더 API 상태, 수집·분석·검증 작업, 상품개발 보드 |
| `jh` | `78b90f4` | 리포트 목록·생성·편집·실무자 평가·저장·인쇄 |
| `seoyeon` | `2bd5957` | 위험 후보 TOP-10, 8개 지표, 분류별 판단 문맥 |
| `sh` | `9d01649` | 위험 상세, 근거 원장, 검토 기록, 인쇄용 의사결정 화면 |

## 수용 결과

| 영역 | 현재 상태 | 이번에 수용한 기능 | 운영 전환 의존성 |
| --- | --- | --- | --- |
| 위험 레이더 `/` | 프런트 API 경계 구현 | 대시보드·뉴스·후보 병렬 조회, 소스별 `LIVE`·마지막 정상 데이터·`SAMPLE fallback`, 부분 실패, 갱신 시각, 작업 완료 후 재조회 | 인증된 위험 레이더 서버, 재시도 정책, 감사 로그 |
| 위험 후보 `/risks` | 로컬 동작·SAMPLE 표시 | TOP-10, 후보별 8개 수치 지표, 동일 가중치 점수, 불리한 위험지표 역점수, 80개 셀 근거, 6개 분류 × 8개 문맥, URL 검색·분류·정렬 상태 | 공식 통계·법령·손해 데이터, 모델 버전과 점수 근거 저장 |
| 위험 상세 `/risks/:riskId` | 로컬 검토·API 경계 | TOP-10 상세 ID, 근거 ID·원문 상태·불확실성·반증, 실무자 상태·체크리스트·메모의 로컬 SAMPLE 저장, 인쇄 레이아웃 | 사용자·권한이 있는 검토 저장 API, 근거 원장, 평가 이력 서버 |
| 종합 리포트 `/reports` | 로컬 fallback·프록시 경계 | 최신 목록 탐색, 12개 상품화 기준의 AI 판단과 실무자 판단 분리, 항목별 메모·보완자료·입력/요율 데이터, 구조화 브리핑 편집, 현재 저장본 기반 Q&A·약관 초안, 인쇄 전 안전 확인 | 운영 생성·저장 프록시, SSO/RBAC, 실데이터 출처 검증 |

## 통합 방식 판정

이번 통합의 기준은 `1번(room 1~4 전체를 브랜치 순서대로 복사)`이 아니라 `2번(브랜치별 전문 vertical slice를 루트 경로에 매핑)`이다.

| 원본 전문 영역 | 루트 통합 경로 | 통합 방식 |
| --- | --- | --- |
| `hyoje` 위험 레이더·수집/분석/검증 | `/` · `/risks` · `/risks/:riskId` | 루트의 공통 도메인과 안정 레이아웃에 맞춰 기능을 분리 수용 |
| `seoyeon` TOP-10 스크리닝 | `/risks` | 8개 지표, 점수, 셀별 근거, 분류·툴팁을 후보 탐색 feature로 수용 |
| `sh` 위험 상세 판단 화면 | `/risks/:riskId` | 상세·추이·근거·불확실성·법령·검증 게이트·검토 메모를 상세 feature로 수용 |
| `jh` 리포트·상품화 평가 | `/reports` | 7개 탭, 12개 평가 기준, 편집·검토·저장·인쇄 흐름을 리포트 feature로 수용 |
| `origin/0721-pivot-hyoje` 개발자 AI 테스트 | `/developer-test` | 네 방 데모와 분리해 LLM·뉴스 실험 수직 슬라이스만 수용 |

각 branch의 `room-one`~`room-four`는 여러 branch에 반복되는 연습용 공통 껍데기가 많다. 따라서 이 폴더들을 루트에 `/rooms/*`로 연결하지 않는다. 특히 `pivot-hyoje`의 네 방 구조는 루트 제품 정보구조가 아니다.

현재 루트는 기능 대응과 주요 상호작용까지 통합되어 있지만, standalone room의 픽셀 단위 스타일·문구·미세 인터랙션까지 완전히 동일한 상태는 아니다. 이 차이는 “기능을 통합하지 않았다”는 뜻이 아니라, 안정 경로·공통 계약을 보존하면서 각 전문 화면의 parity를 계속 닫아야 하는 잔여 작업으로 분류한다.

## 공통 통합 결정

- 안정 경로 `/`, `/risks`, `/risks/:riskId`, `/reports`, `/customer-insight`를 유지한다.
- 고객 화면은 `CustomerLayout`, 실무자 화면은 `RootLayout`을 계속 사용한다.
- 후보 비교표와 상세 화면은 동일한 `detailRiskId`를 사용한다. 다른 후보의 상세를 임시로 재사용하지 않는다.
- 실 API가 없거나 일부 호출만 실패한 경우 성공한 소스는 유지하고, 실패한 소스만 마지막 정상 데이터 또는 명시적 `SAMPLE`로 표시한다.
- 샘플 수치·AI 판단·가상 자료에는 `SAMPLE` 또는 원문 확인 대기 상태를 표시한다.
- 단일 신호나 API 액션 성공만으로 후보를 자동 확정하지 않는다. 담당자 검토 게이트를 유지한다.
- 브라우저 저장은 발표용 로컬 SAMPLE 상태이며 운영 저장으로 표현하지 않는다. 고객 이름·연락처·주소·자유입력 원문은 저장하지 않는다.
- 중첩 저장소인 `otherstatus/**`는 베이스의 TypeScript/ESLint 검사 대상에서 제외하되, 기능 비교 원본으로는 유지한다.

## 검증 항목

- `npm run check`
- `git diff --check`
- TOP-10의 `detailRiskId`와 상세 데이터 1:1 확인
- 한 경로에서 `aria-current="page"`가 하나만 설정되는지 확인
- API 전체 실패와 일부 실패에서 `SAMPLE`·마지막 정상 데이터가 구분되는지 확인
- 리포트 저장·Q&A·약관 초안·인쇄가 현재 저장본을 기준으로 동작하는지 확인

## 검증 결과

- `npm run check`: 통과
- `git diff --check`: 통과
- 후보 10건은 `riskExplorationRecords`의 `detailRiskId`에서 상세 후보·상세 데이터를 함께 생성해 1:1로 유지한다.
- hyoje의 기사 ID·위험 후보 ID는 canonical 상세 ID와 별도 매핑하며, 매핑이 없는 후보는 다른 기사를 재사용하지 않는다.
- 안정 경로와 `isNavigationItemActive()` 기반 단일 활성 내비게이션을 유지한다.
- Vite 500 kB 초과 청크 경고는 남아 있으나 빌드 실패는 아니다.

## 코드 근거

- `src/domain/risk/riskExplorationDemo.ts`
- `src/domain/risk/riskScreeningInsights.ts`
- `src/domain/risk/sampleData.ts`
- `src/domain/risk/riskRadarMappings.ts`
- `src/features/risk-dashboard/`
- `src/features/risk-catalog/RiskExplorationLens.tsx`
- `src/features/risk-detail/`
- `src/pages/risk-dashboard/RiskDashboardPage.tsx`
- `src/pages/risk-detail/RiskDetailPage.tsx`
- `src/pages/reports/ReportsPage.tsx`
- `src/report/`
