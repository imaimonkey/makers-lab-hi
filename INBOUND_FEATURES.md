# 고객 유입 신호가 실무자 워크플로에 연결되는 기능 구조

기준일: 2026-07-23

## 문서 범위

이 문서는 현재 코드에서 고객이 입력한 **내용·생활 환경·위험 아이디어가 실제로 실무자 화면까지 전달되어 활용되는 기능**만 설명한다.

현재 끝까지 연결된 경로는 하나다.

> 개인고객 상황 입력 → 신규 생활 위험 탐지 → 선택 동의 → 비식별 신호 저장 → 실무자 위험 레이더에서 확인

이 연결은 운영 서버가 아닌 **같은 브라우저의 `localStorage`를 사용하는 LOCAL/SAMPLE 데모 흐름**이다. 실무자의 현재 활용 범위도 신호 건수와 요약을 확인하는 데까지이며, 위험 후보 등록·상세 평가·리포트 생성으로 자동 연결되지는 않는다.

## 전체 구조

```text
[개인고객 /customer-insight]
  생활 단계
  생활 환경
  걱정되는 상황
  필요한 도움 수준
  연구 의견 활용 동의
          │
          ▼
[CustomerInsightStudio]
  12자 이상 입력 검증
          │
          ▼
[recommendationEngine]
  상황·키워드 분석
  ├─ 기존 상품 후보 산출 ───────────────→ 고객에게만 안내
  └─ 신규 생활 위험 탐지
       테마 + 제목 + 키워드
       갭 가설 + 실무자 연구 질문
          │
          │ 동의 후 위험 카드별 전송
          ▼
  개인정보 패턴 마스킹
  CustomerSignal 생성
          │
          ▼
[customerSignalStorage]
  localStorage 최대 20건 저장
  브라우저 갱신 이벤트 발생
          │
          ▼
[실무자 /]
  고객 인사이트 유입 건수
  최근 신호 최대 3건
  제목 + 비식별 요약 + 키워드 확인
          │
          └─ 현재 여기까지
             후보 승격·평가·리포트 연결 없음
```

## 1. 고객에게서 유입되는 정보

진입 화면은 실무자 셸과 분리된 `/customer-insight`의 `CustomerLayout`이다.

| 입력 | 의미 | 실무자 신호 반영 |
| --- | --- | --- |
| `lifeStage` | 고객의 생활 단계 | `CustomerSignal`에 코드로 저장되지만 현재 실무자 카드에는 표시하지 않음 |
| `contexts` | 주택·스마트홈, 자동차, 새 이동수단, 자녀 돌봄, 반려동물, 건강, 여행, 개인사업, AI·디지털 생활 | 분석 태그와 상품 후보 산출에 사용하며 신호에는 직접 저장하지 않음 |
| `situation` | 사용 중인 기술·제품·환경, 예상 사고와 피해를 설명하는 자유 입력 | 마스킹 후 최대 180자의 `anonymizedSummary`로 저장 |
| `concernLevel` | 탐색, 기존 보험 빈틈 확인, 상담 필요 | 고객 화면의 입력값이지만 현재 실무자 신호에는 저장하지 않음 |
| `insightConsent` | 비식별 연구 의견 공유에 대한 선택 동의 | 신호 전송 가능 여부를 결정하며 신호 데이터 자체에는 저장하지 않음 |

분석 버튼은 상황 설명이 12자 이상일 때만 동작한다. 이름·연락처·주민등록번호·상세 주소를 입력하지 말라는 안내가 표시되며, 현재 마스킹 로직은 이메일, 휴대전화 번호, 주민등록번호 형태와 일부 일반 번호 패턴을 치환한다.

## 2. 고객 입력을 검토 가능한 신호로 바꾸는 처리

`analyzeCustomerSituation()`은 고객 입력을 두 갈래로 처리한다.

### 고객 안내용 결과

선택한 생활 환경과 자유 입력에서 추론한 태그를 상품 카탈로그와 비교해 기존 상품 후보를 최대 3개 보여준다. 이 결과는 고객의 정보 탐색용이며 실무자 큐에는 전달되지 않는다.

### 실무자 유입용 결과

자유 입력에서 규칙별 키워드를 찾으면 `EmergingRiskFinding`을 만든다.

| 위험 테마 | 현재 탐지 예시 |
| --- | --- |
| `ai-digital` | 생성형 AI, 딥페이크, 챗봇, 해킹 |
| `climate-energy` | ESS, 배터리, 태양광, 충전기, 전기차 |
| `mobility` | 킥보드, 전동휠, 자율주행, 드론, UAM |
| `platform-work` | 플랫폼노동, 배달, 프리랜서, 원격근무 |
| `smart-living` | 스마트홈, 생활로봇, 홈IoT |
| `health-lifestyle` | 웨어러블, 건강앱, 원격의료, 디지털치료 |

각 탐지 결과에는 고객 원문을 그대로 넘기는 대신 다음 연구 문맥을 붙인다.

- 위험 테마와 제목
- 탐지된 키워드
- 기존 담보 설명에서 확인할 `gapHypothesis`
- 실무자가 조사할 `analystQuestion`

분석 결과를 보는 것과 실무자에게 의견을 보내는 것은 분리되어 있다. 고객이 `insightConsent`에 동의하고 각 신규 위험 카드의 전송 버튼을 눌러야만 `CustomerSignal`이 생성된다.

## 3. 실무자에게 전달되는 데이터 계약

공통 계약은 `src/domain/risk/types.ts`의 `CustomerSignal`이다.

| 필드 | 저장 내용 | 현재 실무자 화면 사용 |
| --- | --- | --- |
| `id` | 브라우저에서 만든 신호 ID | React 목록 키 |
| `createdAt` | 생성 시각 ISO 문자열 | 저장만 하고 화면에는 표시하지 않음 |
| `source` | 항상 `customer-voice` | 저장만 함 |
| `lifeStage` | 고객 생활 단계 코드 | 저장만 함 |
| `theme` | 탐지된 `RiskTheme` | 저장만 함 |
| `title` | 신규 생활 위험 제목 | 유입 큐 카드 제목 |
| `anonymizedSummary` | 마스킹된 상황 요약 최대 180자 | 유입 큐 카드 본문 |
| `keywords` | 탐지된 위험 키워드 | 유입 큐 태그 |
| `aggregationStatus` | 항상 `sample-only` | 운영 집계가 아님을 나타내는 안전 상태 |
| `reviewStatus` | 항상 `intake` | 접수 단계이며 후보 확정이 아님 |

고객의 자유 입력 원문은 `CustomerSignal`에 저장하지 않는다. 다만 현재 마스킹은 브라우저의 정규식 기반 보조 처리이므로 상세 주소나 예상하지 못한 식별정보까지 완전히 제거하는 운영 수준의 비식별화는 아니다.

## 4. 브라우저 저장과 화면 간 전달

`customerSignalStorage.ts`가 고객 화면과 실무자 화면 사이의 어댑터다.

```text
storage key: hi-risk-studio.customer-signals.v1
read:         readCustomerSignals()
append:       appendCustomerSignal(signal)
reset:        clearCustomerSignals()
event:        hi-risk-studio:customer-signal
limit:        최신 20건
```

신호를 추가하면 저장 목록을 최신순으로 최대 20건까지 유지하고 `hi-risk-studio:customer-signal` 이벤트를 발생시킨다. 실무자 대시보드의 `RiskDashboardPage`는 다음 두 이벤트를 구독해 목록을 다시 읽는다.

- 같은 페이지 컨텍스트에서 발생하는 사용자 정의 `hi-risk-studio:customer-signal` 이벤트
- 다른 탭·창의 `localStorage` 변경을 알리는 `storage` 이벤트

따라서 고객 모드에서 의견을 보낸 뒤 같은 브라우저의 실무자 모드로 전환하면 유입 결과를 확인할 수 있다. 서버 전송이 아니므로 다른 기기·브라우저·사용자에게는 공유되지 않는다.

## 5. 실무자 워크플로에서의 현재 활용

실무자 진입점은 `/` 위험 레이더다. 전달된 고객 신호는 두 위치에서 사용된다.

1. **고객 인사이트 유입 지표**

   저장된 전체 `CustomerSignal` 개수를 LOCAL 비식별 샘플 건수로 표시한다.

2. **고객 인사이트 유입 큐**

   최신 신호 최대 3건의 제목, 비식별 요약, 키워드를 표시한다. 데모 큐 전체를 비우는 기능도 제공한다.

현재 큐는 실무자가 고객이 체감한 생활 위험을 **초기 탐색 신호로 인지하는 용도**다. 다음 작업은 아직 구현되지 않았다.

- 신호 선택·담당자 배정·검토 상태 변경
- 반복 신호 집계와 중복 제거
- 근거 ID·반증·불확실성 기록
- `/risks` 위험 후보 생성 또는 기존 후보와 연결
- `/risks/:riskId` 상세 평가에 근거로 첨부
- `/reports` 리포트의 출처 또는 판단 근거로 반영

단일 고객 신호는 신규위험 후보로 자동 승격되지 않는다.

## 6. 연결된 기능으로 보지 않는 항목

아래 화면이나 데이터에는 고객 관련 표현이 있지만, 위 `CustomerSignal` 흐름의 소비자가 아니므로 현재 연결 구조에서 제외한다.

| 항목 | 제외 이유 |
| --- | --- |
| `/sales-intake` 영업부서 현장 리포트·상품 개발 제안 | 고객 반응을 요약해 접수할 수 있지만 `hi-risk-studio.sales-intake.v1`에만 저장되고 실무자 대시보드·후보·평가에서 읽지 않음 |
| `/risks`의 `고객 신호` 필터 | 고정 `SAMPLE` 후보 분류를 필터링하며 로컬 `CustomerSignal`과 연결되지 않음 |
| 위험 상세의 `고객 신호` 근거 | `sampleData.ts`의 비식별 집계 샘플이며 고객 화면에서 전송한 신호가 아님 |
| 리포트의 `customer_request`, `sales_request` 출처 타입 | 타입만 정의되어 있고 현재 고객·영업 저장소에서 리포트로 데이터를 가져오는 구현이 없음 |

## 7. 코드 소유 구조

| 계층 | 역할 | 파일 |
| --- | --- | --- |
| 라우팅·레이아웃 | 고객 채널과 실무자 채널 분리 | `src/app/router.tsx`, `src/app/layouts/CustomerLayout.tsx`, `src/app/layouts/RootLayout.tsx` |
| 고객 페이지 조합 | 고객 웹의 설명·입력 기능 배치 | `src/pages/customer-insight/CustomerInsightPage.tsx` |
| 고객 기능 | 입력, 동의, 분석 결과, 신호 전송 | `src/features/customer-insight/CustomerInsightStudio.tsx` |
| 분석 기능 | 상황 태깅, 상품 후보, 신규 위험 탐지, 마스킹, 신호 생성 | `src/features/customer-insight/recommendationEngine.ts` |
| 도메인 계약 | `CustomerSignal`, `RiskTheme` 단일 기준 | `src/domain/risk/types.ts` |
| 저장 어댑터 | 로컬 저장, 조회, 초기화, 갱신 이벤트 | `src/domain/risk/customerSignalStorage.ts` |
| 실무자 소비 화면 | 유입 건수와 최근 신호 큐 표시 | `src/pages/risk-dashboard/RiskDashboardPage.tsx` |

## 현재 상태 요약

| 구간 | 상태 |
| --- | --- |
| 고객 상황 입력 | UI 구현·로컬 동작 |
| 규칙 기반 신규 위험 탐지 | 로컬 동작 |
| 선택 동의 후 비식별 신호 생성 | 로컬 동작 |
| 고객 → 실무자 대시보드 전달 | 같은 브라우저에서 동작 |
| 실무자 신호 열람 | 건수와 최근 3건 표시 |
| 서버 수집·동의 원장·운영 비식별화 | 미연동 |
| 최소 집계·중복 제거·사람 검토 기록 | 미구현 |
| 위험 후보·상세 평가·리포트 연결 | 미구현 |

## 근거 파일

- `src/app/router.tsx`
- `src/pages/customer-insight/CustomerInsightPage.tsx`
- `src/features/customer-insight/CustomerInsightStudio.tsx`
- `src/features/customer-insight/recommendationEngine.ts`
- `src/domain/risk/types.ts`
- `src/domain/risk/customerSignalStorage.ts`
- `src/pages/risk-dashboard/RiskDashboardPage.tsx`
- `src/domain/risk/sampleData.ts`
- `src/features/risk-catalog/RiskExplorationLens.tsx`
- `src/domain/sales/salesIntake.ts`
- `src/report/types.ts`
