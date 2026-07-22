# 0723 통합 브랜치 작업 기록

기준 브랜치: `0721-backup`

통합 브랜치: `0723-backup`

## 통합 원칙

`0721-backup`은 공통 레이아웃·라우팅·도메인 데이터 계약을 제공하고, `0723-backup`은 네 기능 브랜치의 고유 상호작용과 업무 화면을 현재 경로에 포팅한다. 원격 브랜치의 오래된 `room-*` 셸과 전역 스타일은 복사하지 않고, 그 안의 기능을 현재 조합 계층·feature 계층·공식 디자인 토큰으로 재구성했다.

| 원격 기능 브랜치 | 현재 통합 경로 | 반영 상태 | 운영 전환 의존성 |
| --- | --- | --- | --- |
| `origin/hyoje` | `src/features/risk-dashboard/RiskRadarOperationsPanel.tsx`, `src/features/risk-dashboard/riskRadarApi.ts`, 기존 `RiskSignalPipeline` | 이슈 큐 검색·채널 필터, 상품화 준비도·경로 믹스, 수집/본문/분석 액션, 현장 신호 입력, 법령 큐 반영 | 뉴스·법령·상품 API, 실패 재시도, 후보 승격 API |
| `origin/seoyeon` | `src/domain/risk/riskExplorationDemo.ts`, `src/features/risk-catalog/RiskExplorationLens.tsx` | 후보 분류·검색, 시장/우연성/측정/데이터/법적/역선택/도덕적 해이 비교표, 선택 후보 상세, 참고 신호 레지스터 | 공식 통계·법령 피드, 요율화 모델, 비교 상태 저장 |
| `origin/jh` | `src/report/**`, `src/pages/reports/ReportsPage.tsx` | 생성 리포트 목록, 리포트 상세 진입, 섹션별 편집기, 12개 상품화 평가 기준, 내용 업데이트, 생성 fallback·검증 경고·담당자 검토 | AI/GAS 프록시, SSO/RBAC, 리포트 저장·감사 로그 |
| `origin/sh` | `src/features/risk-detail/RiskDecisionWorkspace.tsx`, `src/pages/risk-detail/RiskDetailPage.tsx` | 역할별 검토, 검토 완료/저장/PDF/공유 액션, 다음 액션, 샘플 추이, 근거 필터, 판단 메모·체크리스트 | 실제 근거 ID 원장, 반증 기록, 권한별 저장 API |

## 안정 경로·테마 확인

- `/`, `/risks`, `/risks/:riskId`, `/reports`, `/customer-insight` 경로를 유지했다.
- `/customer-insight`는 `CustomerLayout`, 실무자 상세는 `RootLayout` 아래에 둔다.
- 레이더·후보·리포트의 기존 조합 계층은 유지하고, 상세 검토 기능만 `src/features/risk-detail`로 추가했다.
- 모든 새 수치·추이·검토 제안은 `SAMPLE` 또는 샘플 문구를 유지한다. 보험료·보장·가입 가능 여부를 단정하지 않는다.

## 검증

`npm run check` 통과. Vite의 500 kB 초과 번들 advisory는 기존과 동일하며 빌드 실패가 아니다.

## 다음 의존성

운영 연결 시 `RiskDecisionWorkspace`의 메모·체크리스트를 브라우저 상태가 아닌 권한 검증 저장 API로 교체하고, 각 판단 문장에 `evidenceId`, 불확실성, 반증 또는 보류 이유를 연결한다. 단일 고객 신호나 샘플 점수는 후보 확정 근거로 사용하지 않는다.
