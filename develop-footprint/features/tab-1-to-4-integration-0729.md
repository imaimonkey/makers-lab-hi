# 탭 1~4 통합 워크플로우 구현 기록

기준일: 2026-07-29

## 목적

탭 2·3·4의 수직 개발 결과를 탭 1의 운영 진입점으로 역연결했다. 전체 흐름은 다음 계약을 따른다.

`신호 → 후보 선별 → 상세 검증 → 리포트 스냅샷·검토`

탭 사이에 동일한 숫자나 판단을 복사하지 않고, 각 탭의 권위 데이터를 구분한다.

## 적용 범위

| 영역 | 적용 내용 | 권위·경계 |
| --- | --- | --- |
| 탭 1 `/` | LIVE/LOADING/STALE/SAMPLE 상태, 오늘의 후보, 워크플로우 레일, 고객 신호 집계 진입점 | 운영 상태와 다음 행동만 표시 |
| 탭 2 `/risks` | 공통 `CandidateListViewModel`, 후보 선별점수 0–5, pipeline/candidate 상태 분리, 상세 링크 문맥 보존 | 비교·선택 권위 |
| 탭 3 `/risks/:riskId` | `priorityIndex`·`assessmentScore`·`trendIndex` 분리, Evidence Ledger adapter, 원문·법령 검토 gate, 후보 등록 요청 상태 | 위험 상세·근거 검증 권위 |
| 탭 4 `/reports` | `reportId`/`sourceRiskId` 분리, 원본 시점·snapshot·revision 표시, 탭·hash·popstate 미저장 변경 보호, PDF 메타 일치 | 리포트 결론·검토 권위 |

## 공통 계약

### CandidateListViewModel

`src/domain/risk/candidateViewModel.ts`가 탭 1·2의 공통 후보 표현을 소유한다.

- 후보 ID, 상세 위험 ID, 기사 ID, 제목·요약·분류·태그
- 8개 지표의 원자료와 후보 선별점수(`0–5`, `risk-screening.v1`, `SAMPLE`)
- 근거 ID·개수·연결 상태
- `pipelineStatus`와 `candidateStatus`의 독립 상태
- canonical mapping, 다음 행동, 상세 검증 진입 가능 여부

API 후보에 canonical 매핑이나 근거가 없으면 임의 SAMPLE 점수를 만들지 않고 `pending`과 `—`로 남긴다.

### Evidence Ledger

`src/domain/risk/evidenceLedger.ts`가 SAMPLE 근거와 라이브 기사 분석을 같은 원장 모양으로 정규화한다. 원장 항목은 출처, 원문 URL, 발행·수집 시각, excerpt, supports, confidence, uncertainty, counterpoint, verificationStatus, dataStatus를 함께 가진다.

탭 3은 이 원장을 통해서만 근거를 표시한다. 라이브 응답이 없으면 SAMPLE/STALE/pending 상태를 유지하며, 다른 위험의 근거를 대체 사용하지 않는다.

## 리포트 저장 호환

신규 리포트 저장·조회 키는 `meta.reportId ?? meta.sourceRiskId`를 사용한다. 내용 내부의 `meta.sourceRiskId`는 원본 위험을 식별한다. 기존에 `sourceRiskId` 키로 저장된 local/API 응답은 한 번 더 조회하는 legacy fallback으로 읽을 수 있다.

## QA 결과

- `npm run check` 통과: ESLint, TypeScript project build, Vite production build
- `git diff --check` 통과: 공백 오류 없음
- Vite의 500 kB 초과 chunk 경고는 기존 번들 분할 개선 과제로 남겼으며 빌드 실패가 아니다.
- 후보 목록 → 상세 진입 시 `detailRiskId`와 `from=/risks` 문맥을 보존한다.
- canonical 매핑이 없는 후보는 상세·후보 등록 API를 차단하고 매핑 대기 상태를 표시한다.
- `/customer-insight` 레이아웃과 안정 경로를 변경하지 않았다.

## 다음 운영 의존성

1. 서버가 `CandidateListViewModel`과 Evidence Ledger를 동일 계약으로 반환해야 한다.
2. 최소 집계 기준, 사용자 권한, 사람 검토 이벤트를 API 경계에서 추가해야 한다.
3. 공식 법령·상품 카탈로그·리포트 저장소의 실제 출처와 최신 시각을 연결해야 한다.
4. 실데이터 연결 전까지 모든 수치·AI 해석·로컬 체크 상태는 `SAMPLE` 또는 확인 필요로 취급한다.
