# 탭 3 개발 프롬프트 · 위험 상세 `/risks/:riskId`

## 역할

너는 이 저장소의 React·TypeScript 개발 에이전트다. `탭2-3-4-정보흐름-중복-검토.pdf`의 탭 3 셀프피드백 QA를 반영해 위험 상세 워크벤치를 수정한다. 위험 하나를 근거가 연결된 검증 가능한 판단 대상으로 만드는 것이 목표다.

## 기준 파일

- `src/pages/risk-detail/RiskDetailPage.tsx`
- `src/features/risk-detail/RiskDecisionWorkspace.tsx`
- `src/features/risk-detail/qualitativeAssessment.ts`
- `src/domain/risk/`
- `src/features/llm-util/systemprompting-base-key-value-docs/step3/`

## 우선순위 구현 요구

### P0. 점수와 정보 위계 정리

현재 hero score card, driver panel, priority logic, trend가 같은 `signalStrength`를 반복할 수 있다. 다음 세 의미를 계약으로 분리한다.

```ts
type RiskDetailScores = {
  screeningScore: { value: number; scale: '0-5'; formulaVersion: string; asOf: string; meaning: 'candidate-shortlist' }
  priorityIndex: { value: number; scale: '0-100'; formulaVersion: string; asOf: string; meaning: 'detail-review-priority' }
  assessmentScore: { value: number; scale: 'criterion-defined'; formulaVersion: string; asOf: string; meaning: 'assessment-evidence' }
}
```

- hero에는 현재 판단과 대표 우선순위 1개만 노출한다.
- 산식과 입력은 `priority logic` disclosure에 둔다.
- driver는 6개 평가 항목을 묶은 설명으로 표시하고, `증가성 ← 평가 A·B`처럼 구성 관계를 보여준다.
- trend는 시간축 변화만 소유하며 현재 우선순위 점수와 동일한 값처럼 표시하지 않는다.
- 같은 숫자를 단위만 바꿔 0–5와 0–100으로 중복 표시하지 않는다.

### P0. Evidence Ledger 단일 원장

탭 3의 `Evidence Ledger`를 근거의 권위 원천으로 만든다.

```ts
type EvidenceLedgerItem = {
  evidenceId: string
  articleId: string | null
  sourceName: string
  sourceUrl: string | null
  publishedAt: string | null
  collectedAt: string | null
  excerpt: string | null
  claim: string
  linkedJudgments: string[]
  confidence: number | null
  uncertainty: string[]
  counterEvidenceIds: string[]
  sourceType: 'LIVE' | 'SAMPLE' | 'STALE' | 'UNVERIFIED'
  isMockData: boolean
}
```

- 평가 행·hero·판단 상세에는 전체 원문을 복제하지 말고 `evidenceId`, 연결 판단, 상태만 preview로 둔다.
- 근거 개수만 표시하고 원문·발행일·불확실성·반증을 잃지 않는다.
- 라이브와 SAMPLE 근거를 한 개수로 합치지 않는다.
- `sourceAsOf`, `generatedAt`, `reviewedAt`, `updatedAt`를 구분한다.

### P1. 평가 원천과 드라이버 관계 표시

- 6개 평가 항목을 원천 평가로 유지한다.
- 3개 driver는 파생 설명으로 표시하고 원천 항목 ID를 연결한다.
- 판단 상세의 계산값에는 입력값·계산식·formulaVersion·근거 ID를 함께 둔다.
- 평가값이 없으면 0점으로 대체하지 말고 `needsVerification`과 보류 이유를 표시한다.

### P1. 다음 확인 항목 단일화

- 전체 다음 확인 과제는 탭 3의 체크리스트가 소유한다.
- hero에는 대표 1개, 다른 섹션에는 관련 1~3개 preview만 표시한다.
- 과제는 `taskId`, `text`, `owner`, `dueAt`, `status`, `sourceTab`으로 관리한다.
- localStorage는 발표용 SAMPLE 상태임을 표시하고 저장 주체·저장 시각·서버 반영 여부를 구분한다.

### P1. 데이터 상태와 승격 이벤트

- live detail, 이전 정상 응답, SAMPLE fallback, mapping pending을 별도 상태로 렌더링한다.
- 탭 2에서 전달받은 `riskId`, `articleId`, `evidenceIds`, `screeningScore`를 재계산하지 않고 설명한다.
- “후보 등록 요청”은 검증 완료나 상품화 승인으로 바꾸지 않고 이벤트·다음 큐 상태로 저장한다.

## 금지사항

- 서로 다른 의미의 점수를 같은 `signalStrength`로 묶지 않는다.
- 평가 행과 판단 상세의 근거를 서로 다른 원장으로 만들지 않는다.
- 검색 결과가 없다는 이유로 보장 부재를 판단하지 않는다.
- 원문에 없는 손해액·법률 결론·상품 결론을 생성하지 않는다.
- 브라우저 저장값을 운영 확정 판단처럼 표시하지 않는다.

## 셀프피드백 QA 시나리오

1. hero·driver·logic·trend에서 숫자의 이름·단위·역할이 서로 설명된다.
2. 6개 평가 항목에서 driver 구성 관계와 원천 근거 ID를 열 수 있다.
3. 같은 `evidenceId`가 여러 영역에 preview로 보여도 원문·불확실성·반증은 Ledger 한 곳에만 있다.
4. API 성공·이전 정상·SAMPLE fallback·mapping pending이 화면에서 구분된다.
5. 다음 확인 과제를 체크하면 단일 `taskId` 상태가 바뀌고 담당·기한은 별도 필드로 남는다.
6. 탭 2에서 들어온 `riskId`가 다른 후보로 대체되지 않는다.
7. 후보 등록 요청은 검토 큐 이벤트로만 표시된다.
8. 키보드 포커스, 원문 링크, 빈 상태, 오류 상태, 모바일 레이아웃을 확인한다.

## 완료 기준

- 탭 3에서 `Evidence Ledger`가 근거의 단일 원천이다.
- screening/priority/assessment/trend의 단위와 책임이 분리된다.
- 체크리스트 상태·담당·기한과 SAMPLE 저장 경계가 보인다.
- `npm run check`와 위험 상세 수동 QA가 통과한다.
