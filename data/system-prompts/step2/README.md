# Step 2 · 위험 후보 카드별 시스템 프롬프트

`/risks`의 `주요 법률 및 규제 업데이트` 영역은 하나의 비교표가 아니라 후보별 세로형 카드로 표시한다. 카드의 정보 책임에 맞춰 프롬프트를 파일별로 분리한다.

## 카드와 파일

| 파일 | 화면 카드 | 주요 출력 |
| --- | --- | --- |
| `01-risk-candidate-card.md` | 후보 제목·위험 및 상품화 개요·점수·다음 검토 | `candidate`, `overview`, `screeningScore`, `dataConfidence`, `actions` |
| `02-screening-metrics-card.md` | 신규 위험 타당성 스크리닝 4개 버튼과 상세 패널 | `quantification.market`, `fortuity`, `legalExposure`, `pml` |
| `03-law-regulation-card.md` | 주요 부처별 최신 법률·규제 | `lawTracking` |
| `04-case-loss-market-card.md` | 연관 판례·실제 손해·시장 이슈 | `relatedCases`, `checklist` |
| `05-article-analysis-queue-card.md` | 뉴스 본문 분석 큐 | `articleQueue` |
| `06-candidate-review-card.md` | 상품개발 후보 검토 | `candidateReview` |
| `07-signal-trend-card.md` | 주요 위험 신호 상승 흐름 | `signalTrend` |

`02-screening-metrics-card.md`의 `quantification`이 화면 카드의 주 계약이다. 실제 Step 2 저장 어댑터와 위험 상세의 Evidence Ledger 호환을 위해 같은 응답 안에 기존 8개 `metrics.metricScores`, `metrics.display`, `metrics.metricEvidence`, `metrics.evidenceIds`도 함께 반환한다. 8개 지표는 별도 비교표가 아니라 카드의 근거·점수 계산을 위한 내부 계약이다.

## 공통 입력

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

## 공통 경계

- 기사 본문에서 확인된 사실, AI의 1차 추정, 확인 필요 항목을 분리한다.
- 입력에 없는 수치·법령·판례·손해액·시장규모를 만들지 않는다.
- 모든 사실 문장은 `articleId` 또는 `knownEvidenceIds`로 연결한다.
- 단일 기사나 단일 고객 신호만으로 후보를 확정하거나 자동 승격하지 않는다.
- 보험료·보장범위·면책·가입 가능 여부·법적 결론을 확정하지 않는다.
- 출력은 설명 없는 유효한 JSON 객체 하나만 반환한다.
- 기사에 근거한 1차 표시값은 `isSample: true`와 `confidence: "기사 기반"`을 함께 기록한다. 근거가 없으면 `확인 필요`·`계산 보류`를 사용한다.

검색·분류·정렬·기간 필터, API 상태, 마지막 성공 시각, 권한과 감사 로그는 애플리케이션이 관리하며 LLM이 추정하지 않는다.
