# 개발 문서 인덱스

이 폴더는 현재 구현과 앞으로의 병렬 개발 경계를 기록합니다. 계획과 실제 코드가 다르면 코드 상태를 확인한 뒤 이 문서를 함께 수정합니다.

## 현재 상태

- [기능 분류표](current-feature-classification.md): 구현·샘플·미연동 범위
- [데모 플레이북](demo-playbook.md): 실무자·개인고객 전환 발표 순서
- [프로토타입 사용 설명서](../docs/prototype-usage-manual.html): 실제 화면 목업·CTA 표시와 HTML/PDF/PPTX 발표 산출물
- [QA 리포트](qa-report.md): 경로·상호작용·반응형 검증 결과와 잔여 위험
- [신규위험 실무자 역할](roles/emerging-risk-analyst.md): 사용자 목표와 의사결정 기준
- [고객 역할](roles/customer.md): 고객 흐름과 신뢰 원칙
- [1~4 실무자 워크플로](features/analyst-workflow.md): 팀별 입력·출력·완료 조건
- [5 고객 인사이트 루프](features/customer-insight-loop.md): 현재 구현과 운영 전환 조건
- [영업부서 현장 리포트](features/sales-intake.md): 영업부서 입력과 위험 후보 통합 경계
- [고객·영업 유입 기능](features/inbound-signal-loop.md): 두 유입 경로의 입력·저장·환류·운영 전환 기준
- [핵심 플랫폼](platform/core-platform.md): 라우팅·상태·구조
- [통합 계약](platform/integration-contracts.md): 타입·이벤트·폴더·병합 규칙
- [서비스 경계](platform/service-boundaries.md): 개인정보·추천·인증·AI 경계
- [브랜드 시스템](platform/brand-system.md): 공식 근거와 디자인 토큰
- [개발 슬라이스](roadmap/development-slices.md): 의존성과 권장 병합 순서
- [0723 통합 작업 기록](features/workstream-integration-0723.md): 네 기능 브랜치의 현재 통합 경계와 검증 결과
- [탭 1~4 통합 워크플로우 구현 기록](features/tab-1-to-4-integration-0729.md): 탭 1 역설계, 공통 후보·근거 계약, 저장 식별자 분리와 QA 결과
- [기획·프로젝트 구성 멘토링 요청서](mentoring/project-planning-mentoring-request.md): 제품 범위·운영 모델·개발 순서에 대한 질문
- [보험상품 개발 실무자 멘토링 요청서](mentoring/product-development-practitioner-mentoring-request.md): 실제 업무 적합성·판단 기준·도입 조건에 대한 질문
- [개발자 테스트 워크벤치 루트 통합](features/developer-test-root-integration.md): 네 방 데모와 분리한 LLM·뉴스 실험 기능의 루트 연결
- [탭 2·3·4 QA 반영 개발 프롬프트](features/tab-2-3-4-development-prompts.md): 위험 후보·위험 상세·종합 리포트의 중복·정보 흐름 개선 작업 지시서

## 상태 용어

| 상태 | 의미 |
| --- | --- |
| UI 구현 | 화면과 상호작용이 구현됨 |
| 로컬 동작 | 브라우저 내부 상태로 전체 흐름을 확인할 수 있음 |
| 샘플 표시 | 구조 검토용 가상 데이터이며 운영 데이터가 아님 |
| 미연동 | 실제 인증·API·데이터 파이프라인이 아직 없음 |

## 문서 갱신 원칙

- 완료된 코드만 현재형으로 기록합니다.
- 미래 계획은 `목표`, `예정`, `운영 전환 조건`으로 구분합니다.
- 화면별 책임보다 도메인 계약과 서비스 경계를 먼저 합의합니다.
- 출처가 필요한 브랜드·상품 사실에는 공식 URL과 확인일을 남깁니다.
