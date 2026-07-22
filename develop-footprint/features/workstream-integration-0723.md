# 0723 통합 브랜치 작업 기록

기준 브랜치: `0721-backup`

통합 브랜치: `0723-backup`

## 통합 원칙

`0721-backup`에는 hyoje·seoyeon·jh의 1차 기능이 이미 현재 애플리케이션 구조로 포팅되어 있다. 각 원격 브랜치의 오래된 `room-*` 셸과 전역 스타일을 그대로 병합하면 안정 경로, `RootLayout`, 공통 도메인 계약을 덮어쓸 수 있으므로 현재 경로에 연결된 포팅본을 유지하고, 아직 반영되지 않은 sh 기능만 같은 경계에 추가했다.

| 원격 기능 브랜치 | 현재 통합 경로 | 반영 상태 | 운영 전환 의존성 |
| --- | --- | --- | --- |
| `origin/hyoje` | `src/domain/risk/riskRadarDemo.ts`, `src/features/risk-dashboard/RiskSignalPipeline.tsx` | 상품개발 신호 파이프라인·채널 필터·추이·법령 보류 상태 유지 | 뉴스·법령·상품 API, 실패 재시도, 후보 승격 API |
| `origin/seoyeon` | `src/domain/risk/riskExplorationDemo.ts`, `src/features/risk-catalog/RiskExplorationLens.tsx` | 후보 분류 필터·비교 지표·선택 후보 상세 유지 | 공식 통계·법령 피드, 요율화 모델, 비교 상태 저장 |
| `origin/jh` | `src/report/**`, `src/pages/reports/ReportsPage.tsx` | 생성 fallback·검증 경고·근거 연결·담당자 검토 흐름 유지 | AI/GAS 프록시, SSO/RBAC, 리포트 저장·감사 로그 |
| `origin/sh` | `src/features/risk-detail/RiskDecisionWorkspace.tsx`, `src/pages/risk-detail/RiskDetailPage.tsx` | 역할별 검토, 다음 액션, 샘플 추이, 근거 필터, 판단 메모·체크리스트 추가 | 실제 근거 ID 원장, 반증 기록, 권한별 저장 API |

## 안정 경로·테마 확인

- `/`, `/risks`, `/risks/:riskId`, `/reports`, `/customer-insight` 경로를 유지했다.
- `/customer-insight`는 `CustomerLayout`, 실무자 상세는 `RootLayout` 아래에 둔다.
- 레이더·후보·리포트의 기존 조합 계층은 유지하고, 상세 검토 기능만 `src/features/risk-detail`로 추가했다.
- 모든 새 수치·추이·검토 제안은 `SAMPLE` 또는 샘플 문구를 유지한다. 보험료·보장·가입 가능 여부를 단정하지 않는다.

## 검증

`npm run check` 통과. Vite의 500 kB 초과 번들 advisory는 기존과 동일하며 빌드 실패가 아니다.

## 다음 의존성

운영 연결 시 `RiskDecisionWorkspace`의 메모·체크리스트를 브라우저 상태가 아닌 권한 검증 저장 API로 교체하고, 각 판단 문장에 `evidenceId`, 불확실성, 반증 또는 보류 이유를 연결한다. 단일 고객 신호나 샘플 점수는 후보 확정 근거로 사용하지 않는다.
