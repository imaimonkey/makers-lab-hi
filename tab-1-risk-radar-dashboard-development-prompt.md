# 탭 1 `위험 레이더 통합 대시보드` 개발 프롬프트

> 대상 경로: `/`
> 입력 문서: `tab-2-risk-candidate-development-prompt.md`, `tab-3-risk-detail-development-prompt.md`, `tab-4-comprehensive-report-development-prompt.md`, `develop-footprint/features/analyst-workflow.md`
> 목적: 탭 2·3·4의 권위 데이터와 다음 행동을 역으로 집계해, 실무자가 오늘 무엇을 확인하고 어느 단계로 넘길지 결정하는 통합 진입 화면을 만든다.

## 화면 역할

탭 1은 새로운 판단을 만드는 화면이 아니라 `신호 → 후보 → 상세 검증 → 리포트`의 현재 상태와 진입점을 보여주는 운영 허브다.

> 여러 채널의 변화·최신성·실패 상태를 확인하고, 상세 검증이 필요한 후보를 선택해 탭 2·3·4로 안전하게 넘기는 화면이며, 상품화 승인·보험료·보장 확정·최종 보험 판단을 내리지 않는다.

탭 1에서 답해야 하는 질문은 네 가지다.

1. 최근 관측에서 무엇이 의미 있게 변했는가?
2. 어떤 후보가 오늘 상세 검증 또는 재검토가 필요한가?
3. 어느 데이터 소스가 오래됐거나 실패했는가?
4. 고객·영업 채널에서 반복되는 비식별 미충족 위험은 무엇이며, 어떤 집계·사람 검토가 남았는가?

## 역설계 결과

탭 2·3·4의 역할을 거꾸로 연결하면 탭 1의 출력은 다음과 같다.

| 탭 | 탭 1이 제공할 진입 문맥 | 탭 1에 다시 표시할 범위 |
| --- | --- | --- |
| 탭 2 위험 후보 | 후보 `id`, 후보명, 대표 태그, 선별점수, 후보 상태, 다음 행동 | 비교용 요약만 표시. 8개 지표의 전체 셀 근거·상품화 결론은 복제하지 않음 |
| 탭 3 위험 상세 | canonical `detailRiskId`, `articleId`, 연결된 `evidenceIds`, 탭 2의 선별점수 snapshot | 하나의 대표 후보 preview와 최신 검증 상태만 표시. 우선순위·평가·추세·Evidence Ledger는 탭 3 권위 |
| 탭 4 종합 리포트 | `sourceRiskId`, `verifiedEvidenceIds`, `assessmentSnapshot`, `reviewerDecision`, `missingResearch` | 생성 가능한 리포트 수와 stale/fallback 상태만 표시. 리포트 결론은 탭 4 권위 |
| 고객·영업 유입 | `source`, 비식별 요약, `aggregationStatus`, 반복 횟수 또는 집계 기준 | 단일 고객 신호를 후보처럼 보이지 않게 별도 유입 큐로 표시 |

따라서 탭 1은 다음 세 층으로 구성한다.

```text
관제 층       데이터 최신성·소스별 LIVE/LOADING/STALE/SAMPLE 상태
선택 층       오늘 볼 후보·신호 추세·후보 선별 상태
연결 층       탭 2 비교 → 탭 3 검증 → 탭 4 리포트 생성 진입
```

## 사용자 흐름

```text
탭 1: 소스 상태와 변화 확인
  ├─ 실패/오래된 소스 → 해당 큐 재조회 또는 보류 사유 확인
  ├─ 반복 신호 → 후보 비교(/risks)로 이동
  ├─ 고객·영업 신호 → 비식별 집계·사람 검토 큐에 유지
  └─ 최근 정상 스냅샷 → 대표 후보의 탭 3 상세 검증으로 이동

탭 2: 여러 후보 비교 → canonical mapping 확인
탭 3: priorityIndex·assessmentScore·trendIndex·Evidence Ledger 검증
탭 4: 판단 snapshot 생성 → 7개 하위 탭 편집·저장·PDF 출력
```

탭 1의 링크에는 새로고침 후에도 복원할 수 있도록 가능하면 `from=/`, 현재 필터·정렬·기준일을 전달한다. canonical 매핑이 없는 후보는 다른 샘플 위험으로 대체하지 않고 `상세 매핑 대기`로 비활성화한다.

## 권위 데이터와 계약

### 후보 공통 view model

탭 1·2·작업 큐는 `src/domain/risk/candidateViewModel.ts`의 `CandidateListViewModel`을 단일 기준으로 사용한다.

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
    value: number | null
    scale: '0-5'
    meaning: 'candidate-prioritization'
    formulaVersion: string
    asOf: string
    isMock: boolean
  }
  evidence: { ids: string[]; count: number; status: 'linked' | 'pending' | 'unavailable' }
  pipelineStatus: '수집' | '본문 확보' | 'AI 분석' | '교차검증' | '법령 검토'
  candidateStatus: '후보 대기' | '상세 검토 요청' | '검증 중' | '후보 등록 요청' | '검토 완료' | '보류'
  nextAction?: string
}
```

탭 1에서 `signalStrength`, 탭 2의 `screeningScore`, 탭 3의 `priorityIndex`, 탭 4의 `assessment`를 하나의 숫자로 합치지 않는다. 탭 1의 후보 카드에는 `후보 선별점수 · 0–5 · candidate-prioritization · SAMPLE`을 표시한다.

### 통합 스냅샷

대시보드의 API 경계는 `RiskRadarSnapshotState`를 사용하고 소스별 결과를 독립적으로 유지한다.

```ts
type DashboardSnapshot = {
  generatedAt: string
  sourceStatus: {
    dashboard: 'loading' | 'live' | 'stale' | 'sample'
    news: 'loading' | 'live' | 'stale' | 'sample'
    risks: 'loading' | 'live' | 'stale' | 'sample'
  }
  lastAttemptAt?: string
  lastSuccessfulAt?: string
  errors: Partial<Record<'dashboard' | 'news' | 'risks', string>>
}
```

- `LIVE`: 실제 API 응답을 사용 중
- `LOADING`: 기존 SAMPLE/이전 정상 응답을 지우지 않고 조회 중
- `STALE`: 마지막 정상 응답은 유지하지만 최신성 확인 필요
- `SAMPLE fallback`: API 미연결 또는 실패로 예시 데이터를 사용
- `PARTIAL`: 성공한 소스는 갱신하고 실패한 소스만 이전 응답/SAMPLE로 유지

데이터 카드에는 값만 보여주지 않고 기준 시각·수집 시각·출처 상태를 함께 보여준다. 오류 메시지는 원천 이름과 함께 표시하고 전체 대시보드를 0건으로 바꾸지 않는다.

## 화면 구성

### 1. 페이지 헤더와 안전 문구

- `PageHeader`의 탭 번호 `01`, `EMERGING RISK RADAR`, `위험 레이더`를 유지한다.
- 첫 화면 상단에 `SAMPLE · 예시 데이터 · 실제 내부 운영 데이터 아님`을 표시한다.
- `고객 신호는 최소 집계·비식별 검토 전 후보로 승격되지 않음`을 잠금/보호 문구로 제공한다.
- 운영 API가 연결되더라도 상품 보장·면책·보험료·가입 가능 여부를 단정하는 표현은 사용하지 않는다.

### 2. 오늘의 연결 상태

대시보드·뉴스·위험 후보 소스별 상태를 한 줄의 관제 카드로 제공한다.

| 카드 | 권위 값 | 이동 또는 행동 |
| --- | --- | --- |
| 전체 신호 | `dashboard.metrics.totalSignals` | 실패 시 원천 상태 확인 |
| 뉴스 응답 | `news.length`, generatedAt | 뉴스 수집·본문 큐 |
| 위험 후보 | `risks.length` 또는 candidate view model | 탭 2 후보 비교 |
| 마지막 생성 시각 | `dashboard.generatedAt` | 최신성 disclosure |
| 실패 채널 | `errors`의 source key | 재조회 버튼, 실패 소스만 유지 |

새로고침 버튼은 하나의 pending guard를 사용한다. 연속 클릭 시 중복 조회를 만들지 않으며, 완료 후에는 성공·부분 실패·전체 실패를 `role=status`로 알린다.

### 3. 네 단계 워크플로우 rail

시각적 핵심은 아래 네 단계다.

1. **신호 관제**: 변화량, 절대량, 소스 최신성, 실패 상태
2. **후보 비교**: 여러 신호를 공통 후보 view model과 8개 선별 지표로 비교
3. **근거 검증**: 단일 위험의 평가·추세·Evidence Ledger·다음 확인
4. **리포트 스냅샷**: `reportId`·`sourceRiskId`·근거 snapshot·실무자 검토를 기록

현재 위치는 `/`에만 `aria-current="page"`를 두며, rail의 나머지 링크에는 `aria-current`를 중복 설정하지 않는다.

### 4. 우선 검토 후보

- 후보 3건까지 preview한다.
- 후보명, pipelineStatus, candidateStatus, 근거 개수, 후보 선별점수만 표시한다.
- 상세 링크에는 `detailRiskId`가 있을 때만 `/risks/:detailRiskId?from=/`로 이동한다.
- 이 카드에서 상품성, 보험료, 보장 확정, 최종 판단을 표시하지 않는다.
- 후보가 없으면 `오늘 상세 검증 후보 없음`과 다음 재조회·필터 행동을 함께 제공한다.

### 5. 채널·출처 건강도

뉴스·보험연구·법령·통계·공시 등 채널의 역할, 최근 성공 시각, 지연·실패·품질 상태를 표로 표시한다. 채널 수치가 샘플이면 행과 헤더에 `SAMPLE`을 유지하고, `확인 필요`는 실패인지 단순 미검토인지 구분한다.

### 6. 고객 인사이트 유입 큐

`CustomerSignal`의 비식별 요약·키워드·생성 시각·`sample-only`만 표시한다. 이름, 연락처, 상세 주소, 주민등록번호, 자유입력 원문은 저장하거나 표시하지 않는다.

- 입력 경로는 고객 채널과 영업 현장 채널을 별도로 보존한다.
- 단일 신호를 신규위험 후보처럼 카운트하지 않는다.
- 최소 집계 기준과 사람의 검토가 끝나기 전에는 탭 2 후보 수에 합치지 않는다.
- 브라우저 `localStorage`는 발표용 로컬 SAMPLE 저장소로만 표시한다.

## 상태·오류·빈 상태

| 상태 | 화면 원칙 |
| --- | --- |
| 초기 로딩 | 기존 SAMPLE preview 유지 + `LOADING` 표시 |
| 부분 실패 | 성공 소스는 최신 응답, 실패 소스는 이전 정상/SAMPLE + 실패 원천 표시 |
| 전체 실패 | 0건 대신 마지막 정상 또는 SAMPLE 유지 + 재조회·운영 연결 안내 |
| 빈 후보 | `조건에 맞는 후보가 없음` + `/risks` 전체 보기 |
| 매핑 대기 | 상세 링크 비활성화 + 후보 ID·articleId·대기 이유 표시 |
| 근거 없음 | 근거 0건·연결 대기 표시. 판단 가능으로 표현하지 않음 |
| 권한 없음 | 운영 API의 권한 없음 상태와 담당 관리자 문의 안내 |

## 디자인·접근성

- 공식 Hi Orange `#ff9e1b`, Hi Navy `#00205b`와 기존 CSS 변수를 사용한다.
- 카드 수를 늘리기보다 `관제 → 선택 → 연결`의 세로 리듬을 유지하고, 상태는 배지·텍스트·아이콘을 함께 사용한다.
- 후보 점수와 추세는 색상만으로 구분하지 않고 레이블·단위·기준일을 함께 표시한다.
- 테이블은 모바일에서 가로 스크롤을 허용하고, 상태·필터·재조회·상세 링크는 키보드로 접근 가능해야 한다.
- SVG 추세는 `role="img"`와 의미 있는 aria label을 제공하며, reduced motion을 존중한다.
- 작은 텍스트에 낮은 대비를 사용하지 않고, focus-visible outline을 유지한다.

## 탭 2·3·4 통합 적용 목록

### 탭 2 후보 비교

- Lens와 Operations 모두 `CandidateListViewModel`을 사용한다.
- 비교표 점수는 `0–5 · 후보 우선순위 · 산식 버전 · 기준일 · SAMPLE`을 표시한다.
- 툴팁은 대표 사유 최대 2개와 근거 개수만 보여주고 전체 판단은 탭 3으로 넘긴다.
- `pipelineStatus`와 `candidateStatus`를 두 줄의 별도 상태 rail로 표시한다.
- 현재 `q`, `category`, `sort`를 상세 이동 URL에 보존한다.
- canonical mapping이 없으면 임의 상세 샘플로 이동하지 않는다.

### 탭 3 위험 상세

- hero의 `priorityIndex`, 6개 assessment의 `assessmentScore`, 추세의 `trendIndex`를 분리한다.
- Evidence Ledger adapter가 `id`, 출처, 발행·수집 시각, excerpt, supports, confidence, uncertainty, counterpoint, verificationStatus, dataStatus를 소유한다.
- `LIVE API`, `LOADING`, `SAMPLE fallback`, `STALE`, `MAPPING PENDING`를 상태 adapter에서 결정한다.
- 다음 확인 체크는 브라우저 로컬 SAMPLE 진행 상태로 표시하고, 담당자·기한을 추정하지 않는다.
- 후보 등록은 `후보 등록 요청` 이벤트이며 성공·실패·중복 클릭·매핑 대기를 분리한다.

### 탭 4 종합 리포트

- `reportId`와 `sourceRiskId`를 분리하고 `sourceAsOf`, assessment/evidence snapshot version을 보존한다.
- 7개 하위 탭은 각각 하나의 질문과 권위 데이터를 소유하며 다른 탭은 ID·개수·preview만 소비한다.
- 원본 위험 상세와 리포트 draft를 양방향 자동 동기화하지 않고, 변경 사유·작성자·시각이 있는 override로 구분한다.
- 편집 중 탭 이동은 저장·변경 폐기·취소를 제공하고, 저장 실패 시 이동을 중단한다.
- 웹과 PDF는 같은 selector, 상태 라벨, 숫자 단위, 근거 ID를 사용한다.

## 구현 경계

- 페이지는 `PageHeader`와 feature 조합만 담당한다.
- 후보 변환·점수·canonical mapping은 `src/domain/risk` adapter에 둔다.
- API 호출·재조회·pending guard는 `src/features/risk-dashboard` 또는 해당 feature에 둔다.
- 고객 신호 저장은 `customerSignalStorage` 계약을 통하고 페이지에서 `localStorage`를 직접 호출하지 않는다.
- 전역 토큰을 변경하지 않고 탭 1 보조 스타일은 `global.css`의 기존 변수 범위에서 추가한다.
- 외부 API 키와 모델 키는 브라우저 번들에 넣지 않는다.

## QA 시나리오

1. 기본 `/`에서 소스별 `LIVE/LOADING/STALE/SAMPLE fallback`과 생성 시각을 확인한다.
2. 탭 1 우선 후보 3건의 제목·ID·선별점수가 탭 2 비교표와 일치하는지 확인한다.
3. 탭 1에서 탭 2·3·4로 이동한 뒤 뒤로가기로 복귀해 URL과 후보 문맥이 유지되는지 확인한다.
4. API 부분 실패와 전체 실패에서 성공 소스가 유지되고 실패 소스만 표시되는지 확인한다.
5. 고객 신호가 있어도 후보 수와 우선순위에 자동 합산되지 않는지 확인한다.
6. 탭 2의 검색·분류·정렬 후 상세 이동에서 `from`, `q`, `category`, `sort`가 유지되는지 확인한다.
7. 탭 3에서 priority/assessment/trend 숫자가 다른 의미로 읽히고 Evidence Ledger가 단일 원장인지 확인한다.
8. 탭 4에서 reportId/sourceRiskId, fallback/stale, 미저장 변경 보호, PDF 상태·근거 일치를 확인한다.
9. 모바일 가로 스크롤, 키보드 focus-visible, 빈 상태, 오류 상태, 권한 없음 상태를 확인한다.
10. `npm run check`, `git diff --check`를 실행하고 baseline 오류와 이번 변경 오류를 구분한다.

## 완료 기준

- 탭 1이 탭 2·3·4의 결론을 복제하지 않고 다음 행동과 이동 문맥만 제공한다.
- 네 탭의 후보 ID·근거 ID·기준일·상태 라벨이 단일 계약으로 추적된다.
- 샘플 수치·AI 보조 판단·로컬 저장 상태가 실제 운영 데이터나 최종 보험 판단으로 오인되지 않는다.
- 실패·빈 상태·매핑 대기·저장 실패가 안전하게 보이고, `npm run check`가 통과한다.
