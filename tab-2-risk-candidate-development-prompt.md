# 탭 2 `위험 후보` 개발 프롬프트

> 대상 경로: `/risks`
> 참고 문서: `탭2-3-4-정보흐름-중복-검토.pdf`
> 목적: 위험 후보 화면을 “발견·비교·상세 검증 진입”에 집중시키고, 탭 3과 중복되는 상세 판단·근거 정보를 줄인다.

## 개발자에게 전달할 작업 지시

당신은 이 저장소의 탭 2 `위험 후보` 화면을 수정하는 개발자입니다. 현재의 검색·카테고리·정렬·TOP-10 비교표·작업 큐·API fallback·상세 이동 기능은 유지하면서, 후보 데이터와 점수의 단일 원천을 만들고 탭 3으로 전달되는 정보 계약을 명확하게 정리하세요.

이번 작업의 화면 역할은 다음 한 문장으로 고정합니다.

> 여러 위험 신호를 비교해 “무엇을 상세 검증할지” 선택하는 화면이며, 상품화 승인·보험료·보장 확정·최종 판단을 내리는 화면이 아니다.

## 셀프 QA 결과 및 사실 확인

PDF의 기존 권고를 현재 코드와 대조한 결과입니다. 아래 항목은 구현 시 반드시 반영하세요.

1. `RiskCatalogPage`는 `RiskExplorationLens`와 `RiskExplorationOperations`를 동시에 렌더링합니다.
2. `RiskExplorationLens`는 `src/domain/risk/riskExplorationDemo.ts`의 `riskExplorationRecords`와 `calculateRiskExplorationScore()`를 사용합니다.
3. `RiskExplorationOperations`는 `src/domain/risk/riskRadarDemo.ts`의 `demoRisks`와 `risk.score`를 사용하며, API snapshot도 별도로 표시합니다.
4. 따라서 표의 후보명·점수·순서와 작업 큐의 후보명·점수가 달라질 수 있습니다. 이것은 실제 중복·충돌 위험입니다.
5. 현재 `RiskExplorationRecord`에는 `evidenceIds`와 `articleId`가 필수로 존재하지 않습니다. 탭 3 전달 계약에 근거 ID를 넣으려면 기존 데이터에서 억지로 추정하지 말고, nullable 필드·매핑 어댑터·“근거 연결 대기” 상태 중 하나를 명시적으로 설계하세요.
6. 현재 `detailRiskId`와 `getWorkbenchRiskId()` 매핑을 통해 `/risks/:riskId`로 이동합니다. 매핑 실패를 숨기거나 임의 ID를 만들지 마세요.
7. 현재 Lens 툴팁은 셀마다 AI 분석 근거·데이터 출처·최종 판단을 모두 표시합니다. 비교 흐름을 방해하므로 탭 2에서는 대표 요약만 보여주고 전체 근거는 탭 3으로 연결해야 합니다.
8. 현재 작업 큐의 `pipelineStatus`에 해당하는 수집·본문 확보·AI 분석·교차검증·법령 검토 단계와 `candidateStatus`에 해당하는 후보 상태가 한 흐름처럼 보일 수 있습니다. 두 상태를 구분해야 합니다.

## 수정 범위

우선 확인할 파일:

- `src/pages/risk-catalog/RiskCatalogPage.tsx`
- `src/features/risk-catalog/RiskExplorationLens.tsx`
- `src/features/risk-catalog/RiskExplorationOperations.tsx`
- `src/domain/risk/riskExplorationDemo.ts`
- `src/domain/risk/riskRadarDemo.ts`
- `src/domain/risk/riskRadarMappings.ts`
- `src/features/risk-dashboard/riskRadarApi.ts`
- 필요할 때만 `src/domain/risk/types.ts` 또는 `src/domain/risk/` 아래의 공통 어댑터

페이지 컴포넌트 안에 새로운 중복 타입·점수 계산·localStorage 호출을 만들지 마세요. 공통 계약이 필요하면 `src/domain/risk` 또는 전용 feature adapter에 둡니다. `src/styles/global.css`의 공식 토큰은 변경하지 말고, 탭 2 전용 스타일만 수정합니다.

## 반드시 구현할 내용

### 1. 후보 view model 단일화

Lens와 Operations가 동일 후보를 사용할 수 있도록 공통 변환 계층을 만드세요. 최소 의미는 다음과 같습니다. 실제 타입명은 저장소 계약에 맞게 조정하되 페이지 내부 타입을 만들지 마세요.

```ts
type CandidateListViewModel = {
  id: string
  detailRiskId?: string
  articleId?: string
  title: string
  summary: string
  categories: string[]
  tags: string[]
  screeningScore: {
    value: number
    scale: '0-5'
    meaning: 'candidate-prioritization'
    formulaVersion: string
    asOf: string
    isMock: boolean
  }
  evidence: {
    ids: string[]
    count: number
    status: 'linked' | 'pending' | 'unavailable'
  }
  pipelineStatus: string
  candidateStatus: string
  nextAction?: string
}
```

- `screeningScore`는 탭 2의 후보 선별 점수입니다. 탭 3의 `priorityIndex`나 평가 점수로 이름을 바꾸어 재사용하지 마세요.
- Operations의 `risk.score`가 Lens의 8개 지표 점수와 동일한 의미가 아니라면, 두 값을 조용히 합치지 말고 각각 `source`·`meaning`을 표시하거나 하나를 후보 view model에서 제외하세요.
- `formulaVersion`, `asOf`, `isMock`를 실제 데이터가 없는 상황에서도 생략하지 마세요. SAMPLE이면 화면에 SAMPLE을 유지합니다.
- 동일 `id`가 없는 API 후보는 `canonical mapping pending` 상태로 표시하고 탭 3 링크를 비활성화합니다.

### 2. 비교표 정보 위계 정리

표에는 다음만 남겨 비교 가능성을 우선하세요.

- 순위
- 위험 후보명·한 줄 요약·대표 태그
- 8개 선별 지표
- `AI 보조점수` 또는 `후보 선별점수` 하나
- 상세 분석 이동

수정 규칙:

- 점수 열의 헤더 또는 보조 설명에 `0–5 · 후보 우선순위 · SAMPLE`처럼 단위와 의미를 표시합니다.
- 툴팁은 대표 사유 최대 2개, 근거 개수, `전체 판단 자료는 위험 상세에서 확인` 정도로 제한합니다.
- 긴 법률 해석, 상품화 결론, 예상 보험료, PML, 보상한도는 탭 2에 추가하지 않습니다.
- 셀의 근거 보기 또는 상세 이동에는 `riskId`, `articleId`, `evidenceIds`가 있으면 전달하고, 없으면 연결 대기 상태를 표시합니다.
- 표의 빈 상태 `colSpan`과 aria label은 실제 열 수와 일치하는지 확인합니다.

### 3. 작업 큐와 후보 상태 분리

작업 큐의 상태와 후보의 상태를 별도 라벨·색상·필드로 표시합니다.

```text
pipelineStatus  수집 → 본문 확보 → AI 분석 → 교차검증 → 법령 검토
candidateStatus 후보 대기 → 상세 검토 요청 → 검증 중 → 후보 등록 요청 → 검토 완료/보류
```

- `후보 등록 요청`은 상품화 후보 확정이 아니라 다음 검토 큐로 넘기는 이벤트입니다.
- API 요청 중·성공·부분 실패·실패를 버튼 disabled와 notice로 구분합니다.
- 재조회 실패 시 기존 SAMPLE/이전 정상 응답을 유지하되, 어떤 source가 실패했는지 표시합니다.
- 동일 액션을 빠르게 두 번 실행해 중복 등록되지 않도록 idempotency 또는 pending guard를 둡니다.

### 4. 탭 3 이동 계약

상세 분석 링크는 최소한 아래 문맥을 잃지 않아야 합니다.

```text
riskId
detailRiskId
articleId (있는 경우)
evidenceIds (연결된 경우에만)
screeningScore.value / scale / formulaVersion / asOf
candidateStatus
from=/risks
현재 q / category / sort
```

URL query로 전달할지 별도 navigation state로 전달할지는 구현자가 선택하되, 새로고침과 뒤로가기로 복원 가능한 방식을 우선합니다. 매핑되지 않은 후보는 임의로 상세 샘플을 열지 않습니다.

## 금지 사항

- 탭 2에서 `상품성 있음`, `상품화 승인`, `보험료 산출 완료`, `보장 확정`을 단정하지 마세요.
- `riskExplorationRecords`와 `demoRisks`의 값을 화면 JSX에서 직접 조합해 임시 통합하지 마세요.
- 기존 `riskId`나 `detailRiskId`를 제목·배열 index로 생성하지 마세요.
- 탭 3의 전체 Evidence Ledger, 평가 상세, 원문·반증 정보를 다시 구현하지 마세요.
- 전역 색상·공통 내비게이션·다른 페이지의 UI를 대규모로 변경하지 마세요.

## 완료 조건

- Lens와 Operations에서 같은 후보의 `id`, 제목, 대표 점수가 일치한다.
- 같은 후보의 점수는 한 번만 계산되고, 단위·의미·산식 버전·기준일이 노출된다.
- `detailRiskId`가 없는 후보는 상세 이동 대기 상태이며 잘못된 화면을 열지 않는다.
- 툴팁이 비교를 방해하지 않고 전체 근거는 탭 3로 이동할 수 있다.
- `pipelineStatus`와 `candidateStatus`가 서로 다른 정보로 읽힌다.
- API live/loading/stale/fallback/error 상태가 서로 섞이지 않는다.
- 현재 `q`, `category`, `sort` URL 동작이 유지된다.
- 키보드로 필터·표·근거 보기·상세 이동이 가능하고 모바일 표 가로 스크롤이 유지된다.
- 기존 `/risks/:riskId` 라우트와 canonical 매핑이 깨지지 않는다.

## QA 시나리오

1. 기본 화면에서 Lens와 Operations의 겹치는 후보 3개를 비교해 제목·ID·점수가 일치하는지 확인합니다.
2. 검색·카테고리·정렬을 변경한 뒤 상세로 이동하고 뒤로가기를 실행해 URL과 목록 상태가 복원되는지 확인합니다.
3. canonical 매핑이 없는 API 후보에서 상세 링크가 잘못된 SAMPLE로 연결되지 않는지 확인합니다.
4. 본문 확보·대기 큐·검증·후보 등록 요청을 빠르게 반복해 중복 요청이 발생하지 않는지 확인합니다.
5. API 일부 실패, 전체 실패, LOADING, 이전 응답 유지 상태를 각각 확인합니다.
6. `npm run lint`, `npm run build`, 관련 feature 테스트를 실행하고 변경 파일 목록과 미해결 baseline 오류를 보고합니다.

## 개발 완료 보고 형식

1. 변경 파일 목록
2. 후보 공통 view model과 점수 권위 원천
3. 탭 3으로 전달한 `riskId/articleId/evidenceIds` 계약
4. Lens·Operations 중복 제거 방식
5. API 실패·SAMPLE 처리 방식
6. 웹·모바일·키보드 QA 결과
7. 테스트 결과와 남은 리스크
