# 개발자 페이지 AI 연결 맵

기준일: 2026-07-30

이 문서는 개발자 모드에서 `페이지 → 입력 데이터 → 시스템 프롬프트 → AI 실행 → 저장 결과 → 다음 페이지`를 연결하기 위한 구현 기준이다. 시스템 프롬프트 원문은 수정하지 않고, `data/system-prompts`의 페이지별 복제본을 실행 입력으로 사용한다.

## 전체 흐름

```text
자료·뉴스 수집
  → Step 1 / util-1 뉴스 신호 구조화·위험 묶음
  → Step 2 / util-2 위험 후보·지표·법령·사고·큐·검토·추세
  → Step 3 / util-3 위험 상세 근거·평가·추세·판단·상품화·인계
  → Step 4 / util-4 리포트 요약·공백·문구·상품화·구조·브리핑·근거
```

## 현재 연결 상태

| 단계 | 개발자 경로 | 현재 입력 | 프롬프트 위치 | 실행·저장 상태 | 연결할 다음 결과 |
| --- | --- | --- | --- | --- | --- |
| util-0 | `/developer-test` 범용 탭 | 업로드 파일·텍스트·Excel | `data/system-prompts/util-0/system-prompt.md` | 실행 및 `data/util-0-risk-discovery.xlsx` 저장 | Step 1 입력 자료·문서 목록 |
| Step 1 / util-1 | `/developer-test` 뉴스 패널 | 네이버 뉴스 검색·수집 결과·기존 위험 묶음 | `data/system-prompts/step1/01-news-risk-clustering.md` | 자동 분류·묶음 저장 연결 | Step 2 아티클·위험 묶음 후보 |
| Step 2 / util-2 | `/developer-test/risks` | `src/article` PDF와 Step 1 신호 문맥 | `data/system-prompts/step2/*.md` | 7개 분석 실행·Excel 저장 연결 | `/developer-test/risks/:riskId` |
| Step 3 / util-3 | `/developer-test/risks/:riskId` | Step 2 결과·원문·근거·추세·평가 입력 | `data/system-prompts/step3/*.md` | 전용 실행·결과 저장 미연결 | Step 4 리포트 입력 |
| Step 4 / util-4 | `/developer-test/reports` | 아티클·Step 3 결과·근거 문맥 | `data/system-prompts/step4/*.md` | 7개 분석 실행·Excel 저장 연결 | 실무자 리포트 미리보기 |

## Step 3 연결 목록

`util-3`은 단일 거대 프롬프트로 실행하지 않고 다음 카드별로 실행한다.

| 파일 | 개발자 상세 UI 위치 | 입력 | 결과 키 |
| --- | --- | --- | --- |
| `01-risk-context-and-input.md` | 위험 개요·입력 자료 | Step 2 후보, 원문, source metadata | `context` |
| `02-risk-summary.md` | 위험 요약 | 확인 사실, 변화 원인, 노출 대상 | `summary` |
| `03-assessment-scores.md` | 평가 요약·판단 상세 | 6개 평가 기준과 근거 | `assessment` |
| `04-signal-trend.md` | 신호 추세 | 시점별 관측값·반증 | `trend` |
| `05-evidence-ledger.md` | 판단 자료·근거 원장 | 원문 문장·출처·근거 ID | `evidence` |
| `06-decision-brief.md` | 판단 브리프 | 신호·손실·근거·보류 사유 | `decisionBrief` |
| `07-productization-review.md` | 상품화 검토 | 상품·약관·법령·데이터 게이트 | `productization` |
| `08-human-review-handoff.md` | 담당자 인계 | 미결 항목·검토자 질문·다음 행동 | `handoff` |

## 구현 계약

1. 모든 실행은 `readDeveloperPromptFile('stepN', fileName)`으로 `data/system-prompts`를 읽는다.
2. 입력에는 canonical `articleId`, `riskId`, `source_id` 또는 `evidenceId`를 포함한다.
3. 출력은 JSON 하나만 허용하고, 저장 전 JSON·근거 ID·개인정보·SAMPLE 상태를 검증한다.
4. 결과 저장은 `data/developer-step3-analysis.xlsx` 또는 운영 전환 가능한 API 경계로 분리한다.
5. Step 3 결과가 없으면 상세 페이지는 SAMPLE/확인 필요 상태를 유지하고 Step 4 실행을 자동 확정하지 않는다.
6. Step 4는 Step 3 결과와 검증된 근거가 없는 경우 상품·보험료·보장·가입 가능 여부를 확정하지 않는다.

## 남은 구현 작업

- `util-3`용 `runStep3Analysis`, Step 3 결과 타입, 결과 저장·조회 API 추가
- `DeveloperRiskDetailPage`에 8개 Step 3 카드 실행·로딩·오류·빈 상태 추가
- Step 3 결과를 `DeveloperReportsPage`의 Step 4 입력에 연결
- util-0 결과에서 승인된 문서 메타데이터만 Step 1 입력으로 전달하는 선택 기능 추가
- 각 실행의 프롬프트 파일 경로, 모델, 생성 시각, 근거 ID를 화면과 저장 결과에 표시
