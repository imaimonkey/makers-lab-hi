# 탭 4 개발 프롬프트 · 종합 리포트 `/reports`

## 역할

너는 이 저장소의 React·TypeScript 개발 에이전트다. `탭2-3-4-정보흐름-중복-검토.pdf`의 탭 4 셀프피드백 QA를 반영해 종합 리포트의 정보 책임과 저장·탭 이동·PDF 흐름을 수정한다. 리포트는 탭 2·3 결과를 결정용 스냅샷으로 고정하지만, 원본 위험 상세를 자동으로 덮어쓰지 않는다.

## 기준 파일

- `src/pages/reports/ReportsPage.tsx`
- `src/report/ReportPage.tsx`
- `src/report/components/ReportSections.tsx`
- `src/report/types.ts`
- `src/report/validation/`
- `src/report/services/`
- `src/report/report.css`

## 우선순위 구현 요구

### P0. 리포트 스냅샷 계약

리포트 생성 시점의 후보·근거·평가 버전을 저장하고, 원본 변경과 리포트 편집을 구분한다.

```ts
type ReportSourceSnapshot = {
  sourceRiskId: string
  sourceArticleIds: string[]
  verifiedEvidenceIds: string[]
  assessmentSnapshot: { version: string; asOf: string; values: Record<string, unknown> }
  gateResults: Record<string, 'pass' | 'review' | 'hold' | 'unknown'>
  sourceAsOf: string | null
  generatedAt: string
  dataStatus: 'LIVE' | 'SAMPLE' | 'STALE' | 'FALLBACK'
  isMockData: boolean
}
```

- `ReportResult`는 `reportId`, `version`, `sourceRiskId`, `sourceSnapshot`을 보존한다.
- 원본 위험 상세가 나중에 바뀌어도 기존 리포트 스냅샷과 편집 이력은 바뀌지 않는다.
- 새로 생성한 리포트와 저장된 리포트를 구분하고, 기준일·생성일·최종 검토일을 표시한다.

### P0. 판정 필드 단일화

리포트 하위 탭마다 독립적인 결론 문장을 만들지 말고 권위 필드와 파생 표시를 정의한다.

| 하위 탭 | 권위 책임 | 허용되는 재사용 |
| --- | --- | --- |
| 상품화 검토 요약 | 계속 검토할지에 대한 `aiSummary` 초안 | 결정 라벨·대표 위험명·근거 2~3개 |
| 보장 공백 | `riskGapSummary`의 공백 가설·확인 필요 | 기존 보험 관계와 손해 한 줄 |
| 약관 검토 | `wordingFeasibility`의 보장·지급요건·면책 검토 | 관련 공백 한 줄 |
| 상품화 종합평가 | `productFeasibility.assessment`의 게이트·실무자 판단 | 상태·기준·근거 ID |
| 상품 구조 | `productProposal`의 AI 1차 구조 제안 | 평가 결과와 미결 질문 |
| 종합 브리핑 | `ui.briefing`의 회의 결정·후속 과제 파생본 | 결정·근거·담당·기한 요약 |
| 근거자료 | `evidence`, `missingResearch`의 출처·불확실성 원장 | ID·자료 상태 |

- `productFeasibility.assessment`를 상품화 게이트의 권위로 두고, `aiSummary`와 `ui.briefing`은 이를 요약한다.
- 동일한 결론이 충돌하면 조용히 덮어쓰지 말고 `decisionConflict`와 원천 필드를 표시한다.
- AI 판단과 실무자 판단을 별도 필드·작성자·시각으로 유지한다.

### P1. 편집 경계와 저장

- 리포트 편집·검토 저장은 현재 `ReportResult` 버전에만 반영한다.
- 탭 3 위험 상세의 원본 평가·근거를 자동 수정하지 않는다.
- 원본 동기화가 필요하면 별도 명시 이벤트 `syncFromRiskDetail`를 만들고 변경 전후·사용자·시각·대상을 기록한다.
- 저장 실패·권한 없음·빈 상태·오래된 리포트 상태를 명시한다.

### P1. 탭 이동 보호

저장되지 않은 편집·검토 입력이 있을 때 탭 이동, 모드 변경, 리포트 닫기, 다른 경로 이동 전에 다음 선택을 제공한다.

```text
저장하고 이동 / 변경 폐기 / 취소
```

- 브라우저 `beforeunload`만으로 처리하지 않는다.
- 내부 탭 이동은 URL hash/query와 React Router 상태를 함께 보존한다.
- 뒤로가기와 직접 URL 진입에서 같은 탭·리포트 ID를 복원한다.
- `aria-current="page"`는 한 경로에서 하나만 유지한다.

### P1. PDF와 웹의 신뢰성

- PDF는 웹 하위 탭 순서와 동일한 순서로 출력한다.
- `SAMPLE`, 근거 ID, sourceAsOf, confidence, 미확정 항목, 실무자 판단 상태를 누락하지 않는다.
- 현재 탭·전체 리포트·선택 섹션 출력이 동일한 저장 스냅샷을 사용한다.
- 인쇄용 문구가 실제 보험료·보장·가입 가능 결론처럼 변하지 않는지 확인한다.

## 금지사항

- 탭 2의 screeningScore를 상품화 승인·거절로 재사용하지 않는다.
- 탭 3의 원본 평가를 리포트 편집으로 조용히 덮어쓰지 않는다.
- `aiSummary`, `productFeasibility.assessment`, `ui.briefing`이 서로 다른 결론을 낼 때 한 문장을 임의로 선택하지 않는다.
- 저장되지 않은 변경을 탭 이동 시 폐기하지 않는다.
- 근거 ID·기준일·SAMPLE 상태를 PDF에서 생략하지 않는다.

## 셀프피드백 QA 시나리오

1. 리포트 생성 후 `sourceRiskId`, verified evidence, assessment version, sourceAsOf가 저장된다.
2. 원본 위험 상세를 변경해도 기존 리포트 스냅샷·편집값은 변하지 않는다.
3. 상품화 검토 요약·종합평가·브리핑의 결론이 권위/파생 관계로 추적된다.
4. AI 판단과 실무자 판단, 작성자·저장 시각·변경 사유가 분리된다.
5. 입력을 수정한 뒤 하위 탭 이동 시 저장·폐기·취소 선택이 나타난다.
6. 모드 변경·리포트 닫기·사이드바 이동에도 같은 보호가 적용된다.
7. 새로고침·뒤로가기·직접 URL 진입에서 reportId와 reportTab이 복원된다.
8. PDF의 순서·숫자 단위·근거 ID·SAMPLE·미확정 문구가 웹과 일치한다.
9. 로딩·빈 리포트·API 실패·권한 없음 상태가 정상 화면과 구분된다.

## 완료 기준

- 리포트 생성 스냅샷과 편집 버전이 분리된다.
- 하위 탭별 권위 필드와 파생 관계가 코드·화면·PDF에서 추적된다.
- 저장되지 않은 변경 보호가 탭·모드·경로 이동에 적용된다.
- PDF가 웹과 같은 상태·근거·기준일을 출력한다.
- `npm run check`와 종합 리포트 수동 QA가 통과한다.
