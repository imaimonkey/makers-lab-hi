# Step 2 · 위험 후보 카드별 시스템 프롬프트

`/risks`의 위험 후보 화면을 기사 원문과 출처 메타데이터에서 독립적으로 도출하기 위한 프롬프트 모음이다. 한 파일에서 모든 카드를 생성하지 않고, 화면의 카드 섹션과 데이터 책임에 맞춰 프롬프트를 분리한다.

## 카드와 파일

| 파일 | 화면 카드 | 주요 출력 |
| --- | --- | --- |
| `01-risk-candidate-card.md` | 위험 후보 기본 정보·비교표 행 | `RiskExplorationRecord` 기본 필드 |
| `02-screening-metrics-card.md` | 8개 지표 비교 셀·셀별 근거 | `metricScores`, `display`, `metricEvidence` |
| `03-law-regulation-card.md` | 법령 트래킹 좌측 목록·우측 상세 | `lawTracking.items`, `timeline`, `beforeChanges`, `afterChanges` |
| `04-case-loss-market-card.md` | 법령 상세의 연관 판례·실제 손해 탭 | `relatedCases`, `checklist` |
| `05-article-analysis-queue-card.md` | 뉴스 본문 분석 큐 | `articleQueue` |
| `06-candidate-review-card.md` | 상품개발 후보 카드 | `candidateReview` |
| `07-signal-trend-card.md` | 주요 위험 신호 상승 흐름 | `signalTrend` |

## 공통 입력

기사 원문을 입력할 때 다음 메타데이터를 함께 전달한다.

```json
{
  "articleId": "A-001",
  "title": "기사 제목",
  "body": "확보된 기사 본문",
  "sourceName": "출처명",
  "sourceUrl": "https://example.com/article",
  "publishedAt": "2026-07-28T09:00:00+09:00",
  "collectedAt": "2026-07-28T10:00:00+09:00",
  "priorArticles": [],
  "knownEvidenceIds": []
}
```

## 모든 프롬프트에 적용하는 경계

- 제목·검색 결과 요약만으로 사실을 만들지 말고 기사 본문에서 확인된 주장과 추론을 구분한다.
- 입력에 없는 수치, 법령명, 판례, 기관, 손해액, 시장 규모, 가입 수요를 만들지 않는다.
- 모든 사실성 문장에는 입력된 `articleId` 또는 `knownEvidenceIds`를 근거로 연결한다.
- 단일 기사나 단일 고객 신호만으로 위험 후보를 확정하거나 자동 승격하지 않는다.
- 보험료, 보장 범위, 면책, 가입 가능 여부, 법적 결론을 확정하지 않는다. 필요한 경우 `확인 필요`와 보류 이유를 출력한다.
- 고객 이름, 연락처, 주민등록번호, 상세 주소, 자유입력 원문 등 개인정보를 출력하지 않는다.
- 출력은 설명 문장 없이 유효한 JSON 객체 하나만 반환한다. Markdown 코드 펜스와 추가 코멘트는 금지한다.
- `SAMPLE` 값은 운영 데이터나 공식 판단이 아니라 기사 기반 검토 초안임을 나타낸다.

## LLM이 만들지 않는 값

검색어·분류·정렬·기간·지역 필터, API 응답 상태, 마지막 성공 시각, 업무 단계별 큐 숫자, 권한과 감사 로그는 애플리케이션과 서버가 관리한다. 기사 분석 LLM은 이 값을 추정하지 않는다.

