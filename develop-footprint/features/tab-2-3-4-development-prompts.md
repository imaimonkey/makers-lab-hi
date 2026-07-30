# 탭 2·3·4 QA 반영 개발 프롬프트

2026-07-29 `탭2-3-4-정보흐름-중복-검토.pdf`의 셀프피드백·QA 결과를 구현 작업으로 전환한 개발용 프롬프트 모음이다.

| 파일 | 대상 | 핵심 수정 |
| --- | --- | --- |
| [tab-2-risk-candidate-development.md](tab-2-risk-candidate-development.md) | `/risks` 위험 후보 | 후보 원천·점수·상태·상세 이동 계약 단일화 |
| [tab-3-risk-detail-development.md](tab-3-risk-detail-development.md) | `/risks/:riskId` 위험 상세 | 점수 위계·근거 원장·후속 과제 권위화 |
| [tab-4-reports-development.md](tab-4-reports-development.md) | `/reports` 종합 리포트 | 스냅샷·판정 필드·편집 경계·PDF 신뢰성 |

공통 원칙은 `발견 → 검증 → 결정`의 승격 흐름을 유지하고, 같은 숫자·상태·문장을 화면별로 재계산하지 않는 것이다. 각 프롬프트는 독립적으로 코딩 에이전트에게 전달할 수 있도록 현재 파일, 구현 요구사항, 금지사항, QA 시나리오와 완료 기준을 포함한다.
