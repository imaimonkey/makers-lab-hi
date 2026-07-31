# 탭 2 개발 프롬프트 · 위험 후보 `/risks`

## 역할

너는 이 저장소의 React·TypeScript 개발 에이전트다. `탭2-3-4-정보흐름-중복-검토.pdf`의 탭 2 셀프피드백 QA를 반영해 위험 후보 화면을 수정한다. 작업 후 코드 변경, 계약 변경 이유, 테스트 결과를 요약한다.

## 목표

탭 2는 여러 신호를 비교해 “어떤 위험을 탭 3에서 상세 검증할지” 고르는 발견·선별 화면이다. 상세 법률 해석, 상품화 결론, 실제 보험료는 소유하지 않는다.

## 우선순위 구현 요구

### P0. 후보 원천을 하나로 통합

현재 `RiskExplorationLens`는 `riskExplorationRecords`, `RiskExplorationOperations`는 `demoRisks`를 사용한다. 두 배열을 화면에서 직접 소비하지 말고 공통 도메인 어댑터와 `CandidateListViewModel`을 만든다.

최소 계약은 다음 필드를 포함한다.

```ts
type CandidateListViewModel = {
  riskId: string | null
  detailRiskId: string | null
  articleId: string | null
  evidenceIds: string[]
  title: string
  summary: string
  tags: string[]
  categories: string[]
  screeningScore: {
    value: number
    scale: '0-5'
    formulaVersion: string
    asOf: string
    meaning: 'candidate-shortlist'
    sourceType: 'SAMPLE' | 'LIVE'
    confidence: number | null
    isMockData: boolean
  }
  pipelineStatus: 'collection' | 'body_ready' | 'analyzing' | 'cross_check' | 'law_review' | 'candidate_review'
  candidateStatus: 'not_registered' | 'review_requested' | 'reviewing' | 'hold' | 'registered'
  dataStatus: { sourceType: 'SAMPLE' | 'LIVE' | 'STALE' | 'LOADING'; sourceAsOf: string | null }
  nextActionPreview: string
}
```

- canonical `riskId` 매핑이 없으면 다른 후보 상세를 재사용하지 않는다.
- `source`, `sourceAsOf`, `isMockData`를 유지하고 SAMPLE·LIVE·STALE·LOADING을 하나의 숫자로 합치지 않는다.
- 후보 표와 작업 큐가 같은 후보명·점수·상태를 표시하는지 확인한다.

### P0. 점수 체계를 단일화

- 탭 2에서 대표로 표시하는 값은 `screeningScore` 하나다.
- `0–5`, 계산식 버전, 기준일, 의미를 점수 옆 또는 접근 가능한 설명에 표시한다.
- Operations의 기존 `risk.score`를 별도 점수로 재계산하지 말고 어댑터에서 같은 `screeningScore`로 변환한다.
- 탭 3의 `priorityIndex`나 탭 4의 상품성 판정을 탭 2의 선별점수와 같은 의미로 표시하지 않는다.

### P1. 상세 이동 계약 강화

`상세 분석` 또는 `후보 등록 요청` 이벤트는 다음 값을 함께 전달한다.

```ts
{
  riskId,
  detailRiskId,
  articleId,
  evidenceIds,
  candidateStatus,
  screeningScore,
  sourceAsOf,
  nextActionPreview
}
```

- 이동 URL에는 canonical `riskId` 또는 `detailRiskId`를 유지한다.
- 매핑이 없으면 버튼을 무작정 비활성화하지 말고 `상세 대기`, 매핑 부재 이유, 기사 ID를 표시한다.
- 후보 등록 요청은 검증 완료나 상품화 승인으로 표현하지 않고 다음 단계 큐에 넣는 이벤트로 기록한다.
- 현재 검색·카테고리·정렬 필터는 URL query로 복원 가능하게 유지한다.

### P1. 비교 화면의 정보량 조정

- 지표 툴팁에는 대표 근거 1~2개, 근거 수, `근거 상세` 이동만 표시한다.
- 긴 법률 해석·판례 전문·상품화 결론은 탭 3 또는 법령 상세로 보낸다.
- 법령 트래킹 카드는 현재 구현된 좌측 목록·우측 상세 구조를 유지하되, 원문 확인 필요·SAMPLE 상태를 누락하지 않는다.

### P2. 작업 큐와 후보 상태 분리

화면에 `pipelineStatus`와 `candidateStatus`를 서로 다른 레이블로 표시한다. 본문 확보·AI 분석·교차검증·법령 검토 단계가 곧 후보 확정 상태처럼 보이면 안 된다.

## 금지사항

- 기사 제목만으로 후보를 확정하지 않는다.
- 기존 상품 검색 결과가 없다는 이유로 보장 부재를 단정하지 않는다.
- 화면별 상수로 점수·근거 수·상태를 다시 만들지 않는다.
- `riskId`·`articleId`·`evidenceId`를 하나의 문자열로 합치지 않는다.
- 개인정보와 실제 보험료·보상한도·가입 가능 여부를 표시하지 않는다.
- 안정 경로와 `RootLayout`, 기존 상세 이동 계약을 임의로 변경하지 않는다.

## 셀프피드백 QA 시나리오

1. 같은 후보가 TOP-10 비교표와 Operations 작업 큐에 동시에 나타날 때 제목·점수·상태·대표 다음 행동이 일치한다.
2. 후보 검색·카테고리·정렬을 바꾼 뒤 새로고침해도 URL과 결과가 복원된다.
3. `SAMPLE`, `LIVE`, `STALE`, `LOADING` 상태가 서로 구분된다.
4. 지표 셀 포커스 시 툴팁은 짧은 근거와 근거 수만 보이고, 전체 근거 링크가 탭 3으로 연결된다.
5. 상세 매핑이 있는 후보는 정확한 `/risks/:riskId`로 이동하고, 없는 후보는 다른 후보로 대체되지 않는다.
6. 후보 등록 요청 후 상태가 “검증 완료” 또는 “상품 승인”으로 바뀌지 않는다.
7. 키보드 탭 이동과 모바일 가로 스크롤에서 필터·표·상세 링크를 사용할 수 있다.

## 완료 기준

- 후보 목록과 작업 큐가 하나의 view model을 사용한다.
- 모든 대표 점수에 단위·산식 버전·기준일·SAMPLE 여부가 있다.
- 이동 이벤트가 `riskId`, `articleId`, `evidenceIds`를 보존한다.
- `npm run check`와 탭 2 수동 QA가 통과한다.
