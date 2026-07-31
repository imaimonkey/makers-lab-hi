# 탭 3 `위험 상세` 개발 프롬프트

> 대상 경로: `/risks/:riskId`
> 참고 문서: `탭2-3-4-정보흐름-중복-검토.pdf`
> 목적: 하나의 위험에 대한 우선순위·평가·근거·추세·다음 확인을 단일 판단 워크벤치로 정리하고, 같은 숫자와 근거의 반복을 제거한다.

## 개발자에게 전달할 작업 지시

당신은 이 저장소의 탭 3 `위험 상세` 화면을 수정하는 개발자입니다. 현재의 `riskId` 라우팅, LIVE API 조회, SAMPLE fallback, 평가·근거·추세·다음 확인·후보 등록 요청 기능은 유지하세요. 다만 사용자가 한 화면에서 “현재 우선순위”, “평가 근거”, “변화 추세”, “다음 행동”을 각각 구분해서 읽을 수 있도록 정보 위계를 재구성하세요.

이번 작업의 화면 역할은 다음 한 문장으로 고정합니다.

> 탭 2에서 선택된 하나의 위험을 근거와 함께 검증하고, 탭 4 리포트로 넘길 수 있는 판단 스냅샷을 준비하는 화면이며, 상품화 승인이나 최종 보험 판단을 내리는 화면이 아니다.

## 셀프 QA 결과 및 사실 확인

PDF의 권고를 현재 코드와 대조한 결과입니다.

1. `src/pages/risk-detail/RiskDetailPage.tsx`는 `resolveSampleRiskId()`로 샘플 ID를 해석하고, `getRadarArticleId()`로 LIVE detail API를 선택합니다. API가 없거나 실패하면 SAMPLE fallback을 표시합니다.
2. hero의 우선순위 카드, `RiskDecisionWorkspace`의 핵심 판단 신호, 우선순위 계산 disclosure, 8개월 추세, 판단 상세 metric이 모두 `risk.signalStrength` 또는 그 파생값을 반복해서 보여줍니다.
3. `SampleRiskCandidate.signalStrength`는 0–100 우선순위 SAMPLE이고, `SampleRiskAssessment.score`도 0–100으로 표시되지만 실제로는 1–5 원점수를 ×20한 값입니다. 두 값은 같은 숫자 형식이어도 의미가 다릅니다.
4. 평가 요약 6개 항목이 상세 평가의 원천이어야 하지만, 현재 3개 driver와 판단 상세 metric이 별도 판단처럼 보일 수 있습니다.
5. `SampleRiskEvidence`, `RiskEvidenceContract`, LIVE API의 evidence 응답은 필드가 완전히 동일하다고 가정할 수 없습니다. 공통 Evidence Ledger view model 또는 adapter가 필요합니다.
6. `decisionChecks`는 현재 `string[]`이며 담당자·기한·상태 필드가 없습니다. 후속 업무 계약으로 확장할 때 기존 문자열을 임의 담당자·기한으로 채우지 마세요.
7. 다음 확인 체크 상태는 `localStorage`의 `risk-next-checks:${risk.id}`에 저장됩니다. 이것은 서버 저장·실무 확정·다른 사용자 공유가 아닙니다.
8. 후보 등록 요청은 `EvidenceVerificationWorkspace`의 API 액션입니다. 성공을 상품화 승인이나 검증 완료로 표현하지 말고 등록 요청 이벤트로 구분해야 합니다.

## 수정 범위

우선 확인할 파일:

- `src/pages/risk-detail/RiskDetailPage.tsx`
- `src/features/risk-detail/RiskDecisionWorkspace.tsx`
- `src/features/risk-detail/EvidenceVerificationWorkspace.tsx`
- `src/features/risk-detail/qualitativeAssessment.ts`
- `src/domain/risk/sampleData.ts`
- `src/domain/risk/types.ts`
- `src/domain/risk/riskRadarMappings.ts`
- `src/features/risk-dashboard/riskRadarApi.ts`
- 탭 3 전용 스타일 파일

다른 탭의 화면을 직접 수정하지 말고, 탭 4로 전달해야 하는 공통 계약이 필요할 때만 `src/domain/risk`의 버전 가능한 타입·adapter를 추가하세요. 페이지 내부에 중복 평가 타입을 만들지 않습니다.

## 반드시 구현할 내용

### 1. 점수와 지표의 의미 분리

아래 세 종류를 코드·화면·접근성 레이블에서 구분합니다.

```text
priorityIndex  탭 3 hero의 현재 우선순위 · 0–100 · signalStrength 기반 SAMPLE
assessmentScore  6개 평가 항목의 원점수 1–5와 표시용 0–100
trendIndex  최근 관측값의 변화 추세 · priorityIndex와 동일한 값으로 오인 금지
```

- hero에는 `priorityIndex`를 한 번만 크게 표시합니다.
- priority 계산 disclosure에는 입력값·환산·구간·산식·`isMockData`를 표시합니다.
- driver panel은 점수를 다시 강조하기보다 “어떤 평가 항목이 이 우선순위를 설명하는지”를 보여줍니다. 필요한 경우 `driverScore`라고 명시하고, 연결된 assessment ID를 함께 표시합니다.
- 추세 그래프는 `trendIndex`로 표시하고 “절대 손실액·보험료가 아닌 우선순위 관측 지수”라는 설명을 유지합니다.
- 판단 상세의 3개 signal은 6개 평가 항목과 집계 관계를 표시합니다. 예: `증가성 ← assessment:trend`, `피해 심각성 ← assessment:severity`.
- 화면에서 0–100이라는 숫자만 보고 같은 점수로 인식되지 않도록 레이블·툴팁·details에 의미와 단위를 함께 둡니다.

### 2. 권장 화면 위계

다음 순서와 역할을 유지하거나 이에 맞춰 재배치하세요.

1. **위험 문맥 hero**: 위험명, riskId, 상태, 노출 주체, 주요 손해, 다음 확인 1개
2. **현재 우선순위**: priorityIndex 1개, 산출 근거 disclosure, API/SAMPLE 상태
3. **평가 요약**: 6개 평가 항목을 원천 목록으로 표시
4. **다음 확인 항목**: 최대 3개 체크리스트. 체크 상태는 local SAMPLE임을 표시
5. **신호 추세**: 시간 흐름만 설명하며 우선순위 카드와 같은 강조를 피함
6. **판단 자료**: Evidence Ledger 하나만 전체 근거를 소유
7. **판단 상세**: 평가·근거·AI 설명을 연결하되, 위 정보를 복사하지 않고 상세 disclosure로 제공
8. **후보 등록 요청**: 검증 절차가 완료된 뒤 별도 action 상태로 표시

현재 hero, driver, trend, judgment detail에 같은 값이 반복되더라도 모두 삭제할 필요는 없습니다. 사용자의 문맥 유지를 위한 1줄 preview는 허용하되, 상세값의 권위 위치와 “더 보기” 대상은 하나만 두세요.

### 3. Evidence Ledger 단일화

탭 3의 전체 근거 원장을 권위 원천으로 만들고 다음 필드를 유지합니다.

```ts
type EvidenceLedgerItem = {
  id: string
  type: string
  sourceType: string
  sourceName: string
  title: string
  sourceUrl?: string | null
  publishedAt?: string | null
  collectedAt?: string | null
  excerpt?: string
  supports: string[]
  confidence: 'high' | 'medium' | 'low'
  uncertainty: string
  counterpoint: string
  verificationStatus: string
  dataStatus: 'live' | 'sample-only' | 'pending' | 'stale'
}
```

- 평가 요약 행에는 연결 근거 개수와 대표 ID만 표시합니다.
- driver와 판단 상세는 ledger item을 다시 복제하지 않고 ID로 참조합니다.
- LIVE API와 SAMPLE의 필드가 다르면 adapter에서 정규화하고, 없는 값은 “확인 대기”로 표시합니다.
- URL이 있다고 해서 검증 완료로 표현하지 않습니다. 발행일·주장·인용 범위·반증 여부를 보존합니다.

### 4. API·SAMPLE 상태 정리

상단에 다음 중 하나를 명시합니다.

```text
LIVE API       실제 API 응답을 사용 중
LOADING        상세 응답을 불러오는 중이며 기존 화면을 임의 확정하지 않음
SAMPLE fallback API 실패 또는 미연결로 샘플을 사용
STALE          마지막 정상 응답이 오래되어 최신성 확인 필요
MAPPING PENDING 기사/후보 canonical 매핑 대기
```

- `liveDetail`, `liveLoading`, `liveError`를 화면마다 별도 문구로 임의 조합하지 말고 상태 adapter가 한 번 결정하게 합니다.
- 상태에는 가능하면 `sourceAsOf`와 마지막 정상 응답 시각을 함께 표시합니다.
- API 실패 때문에 기존 SAMPLE을 지우거나 0건으로 표시하지 않습니다.

### 5. 다음 확인과 후보 등록 상태

- `decisionChecks`가 문자열 배열로 유지되는 동안에는 UI에서 담당자·기한·완료 근거를 추정하지 않습니다.
- 장기적으로는 `id`, `label`, `kind`, `owner?`, `dueDate?`, `status`, `source` 구조로 확장하되, 기존 문자열 데이터의 migration fallback을 제공합니다.
- localStorage 체크는 “이 브라우저의 SAMPLE 진행 상태”로 표시하고 저장 시각과 서버 미반영 상태를 보여줍니다.
- 후보 등록 요청은 `idle/loading/succeeded/failed/pending-mapping` 상태를 사용합니다. 성공 메시지는 `후보 등록 요청 완료`로 제한합니다.
- 탭 4 리포트 생성에 넘길 때는 `verifiedEvidenceIds`, `assessmentSnapshot`, `reviewerDecision`, `missingResearch`를 전달할 수 있어야 하며, 값이 없으면 미확정으로 남깁니다.

## 금지 사항

- `signalStrength`, `assessment.score`, `driver.score`, `trend`를 같은 의미의 최종 상품화 점수로 합치지 마세요.
- API 응답이 없는데 LIVE API나 검증 완료로 표시하지 마세요.
- `decisionChecks` 문자열에서 담당자·기한·완료를 추론해 저장하지 마세요.
- Evidence Ledger의 출처·불확실성·반증을 다른 카드에 복사해 두 개의 원장을 만들지 마세요.
- 단일 위험의 점수만으로 상품화 승인·보험료·가입 가능 여부를 단정하지 마세요.
- 탭 2·4의 UI를 직접 바꾸는 대신 필요한 공통 계약만 domain adapter로 제안하세요.

## 완료 조건

- 우선순위 숫자의 의미가 hero, driver, trend, assessment에서 서로 다르게 명확히 읽힌다.
- 6개 평가 항목이 점수·원점수·계산식·연결 근거의 권위 원천으로 남는다.
- 전체 근거 상세는 Evidence Ledger 한 곳에서만 관리되고 다른 영역은 ID/요약만 사용한다.
- LIVE/LOADING/SAMPLE fallback/STALE/MAPPING PENDING 상태가 구분된다.
- 다음 확인 체크가 local SAMPLE 상태임을 분명히 표시한다.
- 후보 등록 요청의 성공·실패·중복 요청·매핑 대기 상태를 확인할 수 있다.
- 브라우저 새로고침과 잘못된 riskId 접근 시 안전한 빈/오류 상태가 표시된다.
- 모바일·키보드 접근성, details 열림 상태, 외부 URL 안전 처리가 유지된다.

## QA 시나리오

1. `ev-battery-fire`와 다른 샘플 위험을 각각 열어 hero priorityIndex와 6개 assessment score의 라벨·산식을 확인합니다.
2. priority 계산 disclosure, driver 설명, trend details를 모두 열어도 같은 숫자가 서로 다른 의미로 보이지 않는지 확인합니다.
3. Evidence Ledger의 type 필터, URL 없는 자료, URL은 있지만 미검증인 자료, SAMPLE 자료를 각각 확인합니다.
4. LIVE API 성공·로딩·실패·오래된 응답·매핑 대기 상태를 각각 재현하거나 mock하여 상태 문구와 데이터가 일치하는지 확인합니다.
5. 다음 확인 체크를 저장·새로고침·다른 riskId 이동 후 확인하고, 서버 저장으로 오인할 문구가 없는지 확인합니다.
6. 후보 등록 요청을 중복 클릭하고 API 실패·성공·canonical mapping 없음 상태를 확인합니다.
7. 잘못된 URL의 `riskId`, 빈 근거, 비어 있는 decisionChecks에서도 오류가 나지 않는지 확인합니다.
8. `npm run lint`, `npm run build`, 관련 feature 테스트를 실행하고 baseline 오류와 이번 변경 오류를 구분해 보고합니다.

## 개발 완료 보고 형식

1. 변경 파일 목록
2. priorityIndex / assessmentScore / trendIndex의 권위 원천과 표시 규칙
3. Evidence Ledger adapter와 LIVE/SAMPLE 상태 처리
4. 다음 확인·localStorage 상태 처리
5. 후보 등록 요청 상태 머신과 탭 4 전달 snapshot
6. 웹·모바일·키보드·오류 상태 QA 결과
7. 테스트 결과와 남은 리스크
