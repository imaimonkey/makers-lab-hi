# 최종 리포트 탭별 기사 분석 프롬프트

2026-07-28 기준으로 최종 리포트 7개 하위 탭의 기사 분석용 시스템 프롬프트를 분리했다.

## 구현 상태

- `상품화 검토 요약` → `aiSummary`
- `보장 공백` → `riskGapSummary`
- `약관 검토` → `wordingFeasibility`
- `상품화 종합평가` → `productFeasibility`
- `상품 구조` → `targetSuitability`, `productProposal`
- `종합 브리핑` → `ui.briefing`
- `근거자료 및 추가 확인사항` → `evidence`, `missingResearch`

프롬프트 파일은 [step4 프롬프트 디렉터리](../../src/features/llm-util/systemprompting-base-key-value-docs/step4/)에 있다. 각 파일은 맥락·목적·입력 안전 기준·키/밸류 출력 계약을 독립적으로 가진다. 상품화 종합평가는 기존 12개 기준 ID와 상태 코드를 유지하고, 종합 브리핑은 실무자 검토 상태를 AI 결과와 분리한다.

## 다음 의존성

1. 기사 입력 어댑터가 canonical `source_id`와 발행·수집 시각을 프롬프트 입력에 전달해야 한다.
2. 탭별 응답을 `ReportResult`로 조합하기 전에 JSON schema와 근거 ID 참조 검사를 적용해야 한다.
3. 실제 약관·상품자료·내부 손해자료를 연결할 때도 기사 기반 가설과 공식 확인 결과를 별도 출처·상태로 유지해야 한다.
4. 운영 전환 시 프롬프트와 모델 버전, 원문 수집 시각, 검토자 변경 이력을 감사 로그에 연결해야 한다.

현재 파일은 기사 기반 의사결정 지원 초안이며, 최종 상품·보험료·요율·약관·법률 의견을 생성하도록 사용하지 않는다.
