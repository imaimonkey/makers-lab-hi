# Step 4 · 최종 리포트 탭별 시스템 프롬프트

최종 리포트의 각 하위 탭을 기사 원문에서 독립적으로 도출하기 위한 시스템 프롬프트 모음이다. 모든 프롬프트는 `ReportResult`의 공통 키를 기준으로 JSON 객체를 반환한다. 화면은 이 원본 데이터에서 요약·집계·상태 표시를 파생하므로, 화면에만 필요한 문구나 숫자를 프롬프트 안에 별도로 하드코딩하지 않는다.

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

## 공통 파생 데이터 규칙

- `productFeasibility.assessment.criteria`가 12개 평가 기준의 단일 원본이다. 요약 화면의 필수 기준 집계, AI 판단 상태, 실무 검토 완료 상태는 이 배열에서 계산한다.
- 각 평가 기준의 AI 이진 판단(`aiDecision`)과 기존 4단계 분석 상태(`status`)를 섞지 않는다. 실무 검토는 `reviewStatus`, `reviewAction`, `reviewerReview`로 별도 저장한다.
- `pml_accumulation`의 PML 시나리오와 상품개발 제안의 가격·한도 산식은 같은 PML 원본을 사용한다. 상품개발 제안에서 PML을 다시 하드코딩하거나 재계산하지 않는다.
- `wording`은 선택 담보 ID별 지급요건·결정사항·보상조항·보장/제외 범위를 연결한다. 첫 번째 담보의 배열을 다른 선택 담보에 재사용하지 않는다.
- 화면에 표시되는 `상품 개발 검토 가치 있음`, `보장 공백`, `상품개발`, `보험료·손해율` 용어를 사용하고, `상품 설계`, `남는 공백`, `실행 가능성` 같은 이전 표현은 새 출력에서 사용하지 않는다.
- 확정되지 않은 금액과 시장·보험료·손해율 값은 `AI 1차 추정`, `프로토타입 가정치`, `추정 범위`, `신뢰도`를 함께 기록한다. 근거가 없는 값은 확정값처럼 표현하지 않는다.
