# 통합 계약

## 안정 경로와 내비게이션

경로 정의는 `src/app/router.tsx`, 메뉴 메타데이터는 `src/shared/config/navigation.ts`가 단일 기준이다. 팀 기능을 합칠 때 기존 경로를 유지하고 페이지 모듈만 교체한다. 위험 상세의 URL 파라미터는 영속 ID이며 화면 제목을 ID로 사용하지 않는다.

`/customer-insight`와 `/sales-intake`는 실무자 좌측 메뉴에 넣지 않는 별도 모드다. 사용자 전환은 `ModeSwitch`가 담당하며, 영업부서 모드는 보험상품개발 실무자와 같은 내부 테마의 리포트 입력·검토 대기 프레임으로 시작한다. 이후 위험 후보와 통합할 때도 접수 ID와 후보 ID를 분리해 연결한다.

활성 메뉴 판정은 `isNavigationItemActive()`만 사용한다. `/risks` 목록은 정확히 일치할 때만 활성화하고 `/risks/:riskId`는 평가 워크벤치를 활성화한다. React Router의 기본 접두어 매칭을 메뉴 클래스에 직접 사용하면 두 탭이 동시에 활성화될 수 있으므로 금지한다.

## 도메인 계약

현재 최소 계약은 `src/domain/risk/types.ts`에 있다.

- `RiskTheme`: 모든 채널이 공유하는 상위 테마 코드
- `RiskEvidenceContract`: 원문 URL, 시점, 주장, 신뢰도를 갖는 근거
- `RiskCandidateContract`: 손실사건·노출집단·원인·손실 유형을 갖는 후보
- `CustomerSignal`: 고객 원문 대신 비식별 요약만 갖는 환류 신호
- `NewsSourceRecord`, `NewsRiskGroup`, `NewsClassificationRun`: 원문 기사, AI가 동적으로 만든 위험 묶음, 분류 실행 이력을 분리한 뉴스 신호 계약

1~4 구현 중 필드가 늘어나면 화면 내부 타입을 만들지 말고 이 계약을 버전 가능한 API 스키마로 확장한다. 날짜는 ISO 8601 UTC 문자열, ID는 표시명과 분리된 불변 문자열을 사용한다. 상태 코드와 사용자 표시 문구도 분리한다.

### AI 뉴스 분류·저장

뉴스는 미리 정의한 위험 카테고리에 넣지 않는다. 1번 AI가 기사에서 위험 조각을 추출한 뒤 `group_key`를 생성하고, `변화 원인 → 노출 대상 → 손실 사건`이 같은 조각을 동적 위험 묶음으로 모은다. 기존 묶음 요약은 다음 실행의 입력으로 제공하며, 같은 위험이면 기존 키를 재사용하고 판단이 어려우면 `uncertain`으로 보류한다.

```text
storage: data/news-classifications.json (개발용)
read: GET /api/news/classifications
append/merge: POST /api/news/classifications
entities: NewsSourceRecord → NewsClassificationRun → NewsRiskGroupRecord
```

저장소는 원문 기사, 매번의 AI 원본 응답·입력 ID, 누적 위험 묶음·병합 이력을 모두 보존한다. `articleCount`는 동일 URL을 중복 계산하지 않은 기사 수이며, `sourceCount`는 연결된 출처 호스트 수다. AI 묶음은 자동으로 `RiskCandidateContract`로 승격하지 않는다.

## 고객 신호 어댑터

현재 어댑터 계약:

```text
storage key: hi-risk-studio.customer-signals.v1
browser event: hi-risk-studio:customer-signal
read: readCustomerSignals()
append: appendCustomerSignal(signal)
demo reset: clearCustomerSignals()
```

페이지가 `localStorage`를 직접 호출하지 않는다. `clearCustomerSignals()`는 발표용 로컬 큐 초기화이며 운영 데이터 삭제 기능을 뜻하지 않는다. 운영 API로 교체할 때 이 어댑터 또는 동일한 기능 계층을 바꾸고 소비자 페이지의 도메인 입력은 유지한다. `aggregationStatus: sample-only`는 운영 집계를 흉내 내지 않는 안전장치다.

## 영업부서 리포트 어댑터

현재 데모 계약:

```text
route: /sales-intake
storage key: hi-risk-studio.sales-intake.v1
read: readSalesSubmissions()
append: appendSalesSubmission(draft)
entity: SalesIntakeSubmission
```

`SalesIntakeSubmission`은 `type`, `channel`, `subject`, `observedRisk`, `proposal`, `followUp`, `id`, `submittedAt`, `status`를 가진다. `observedRisk`와 `proposal`은 영업부서 리포트에서 관찰한 맥락과 상품개발 제안의 요약이며 고객 원문·이름·연락처·계약번호·상세 주소를 저장하지 않는다. 현재 어댑터는 브라우저에 최대 30건을 저장하는 발표용 구현이고, 운영에서는 SSO·RBAC·요청 ID·감사 로그를 제공하는 접수 API로 교체한다.

영업부서 리포트 하나를 신규위험 후보로 자동 승격하지 않는다. 운영 통합 시 최소 집계·중복 확인·사람의 검토를 거쳐 후보 참조 ID를 추가한다.

## 상품 카탈로그 계약

`src/domain/product/catalog.ts`는 화면에 노출 가능한 최소 상품 메타데이터와 공식 링크를 가진다. 이 파일의 설명은 편의를 위한 요약이며 약관 데이터가 아니다.

운영 상품 마스터에는 다음이 추가되어야 한다.

- 판매 상태와 판매 채널
- 적용 시작·종료일
- 상품공시·약관·상품설명서 문서 ID와 버전
- 대상 고객·심사 조건의 승인된 표현
- 링크 검증 시각

판매 중단 상품을 자동 대체하지 말고 결과에서 제외한 이유와 데이터 시점을 남긴다.

## 페이지와 기능 계층

페이지 파일은 다음 역할만 수행한다.

- URL 파라미터·쿼리 읽기
- 기능 컴포넌트 배치
- 페이지 수준 로딩·오류 경계
- `PageHeader` 같은 공통 문맥 제공

수집, 점수 계산, 추천, 저장, API 호출은 `features` 또는 `domain` 어댑터에 둔다. 다른 기능이 페이지 컴포넌트를 가져오지 않는다.

## API 응답 기본 봉투

백엔드 연동 시 팀별로 다른 응답 모양을 만들지 않는다. 권장 최소 형태는 다음과 같다.

```ts
type ApiEnvelope<T> = {
  data: T
  meta: {
    requestId: string
    generatedAt: string
    sourceAsOf?: string
    schemaVersion: string
  }
  warnings?: Array<{ code: string; message: string }>
}
```

페이지네이션은 커서 기반을 우선 검토하고, 필터와 정렬은 URL 쿼리에 직렬화해 공유 가능한 보기를 만든다.

## 스타일 계약

- 공식 토큰: `--hi-navy`, `--hi-orange`, `--hi-orange-vibrant`
- 파생 UI 토큰: 표면, 테두리, 텍스트, 상태색 변수
- 아이콘: `src/shared/components/AppIcon.tsx`의 코드 기반 SVG
- 새 색상 값을 컴포넌트에 직접 반복하지 않는다.
- 공통 컴포넌트 변경은 현재 다섯 경로의 데스크톱·모바일을 함께 확인한다.

## 충돌이 적은 작업 소유권

| 팀 | 주 작업 경로 | 공통 변경이 필요한 경우 |
| --- | --- | --- |
| 1 대시보드 | `src/pages/risk-dashboard`, 전용 feature | 후보 요약 계약을 먼저 제안 |
| 2 목록 | `src/pages/risk-catalog`, 전용 feature | 필터·상태 코드를 도메인에 반영 |
| 3 상세 | `src/pages/risk-detail`, 전용 feature | 근거·평가 계약을 도메인에 반영 |
| 4 리포트 | `src/pages/reports`, 전용 feature | 보고서 스냅샷 계약을 도메인에 반영 |
| 5 고객 | `src/features/customer-insight` | 상품·고객 신호 계약을 유지 |
| 영업부서 | `src/features/sales-intake`, `src/domain/sales` | 리포트 접수 API·후보 연결 계약을 먼저 제안 |

`router.tsx`, `global.css`, `src/domain`은 공유 지점이다. 공유 변경은 소비 경로와 문서를 같은 커밋에서 갱신한다.
