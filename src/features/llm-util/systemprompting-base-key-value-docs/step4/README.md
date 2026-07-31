# Step 4 · 최종 리포트 탭별 시스템 프롬프트

최종 리포트의 각 하위 탭을 기사 원문에서 독립적으로 도출하기 위한 시스템 프롬프트 모음이다. 모든 프롬프트는 현재 `ReportResult`와 `ui.briefing`의 키 이름을 기준으로 JSON 객체를 반환하도록 작성했다.

| 파일 | 최종 리포트 탭 | 주요 출력 키 |
| --- | --- | --- |
| `01-productization-review-summary.md` | 상품화 검토 요약 | `aiSummary` |
| `02-coverage-gap.md` | 보장 공백 | `riskGapSummary` |
| `03-wording-review.md` | 약관 검토 | `wordingFeasibility` |
| `04-productization-assessment.md` | 상품화 종합평가 | `productFeasibility` |
| `05-product-structure.md` | 상품 구조 | `targetSuitability`, `productProposal` |
| `06-executive-briefing.md` | 종합 브리핑 | `ui.briefing` |
| `07-evidence-and-follow-up.md` | 근거자료 및 추가 확인사항 | `evidence`, `missingResearch` |

각 파일은 단독으로 사용할 수 있도록 기사 원문 읽기 기준, 불확실성 처리, 근거 ID 규칙, 출력 예시, 품질 기준을 포함한다. 실제 운영 연결 시에는 입력의 canonical 근거 ID를 전달하고, 최종 저장 전 JSON schema·근거 ID·권한·개인정보 검사를 추가한다.
