# 탭 4 `종합 리포트` 개발 프롬프트

> 대상 경로: `/reports`
> 참고 문서: `탭2-3-4-정보흐름-중복-검토.pdf`
> 목적: 탭 2·3에서 올라온 위험·근거·평가를 하나의 리포트 스냅샷으로 기록하고, 리포트 하위 탭의 책임·편집·저장·PDF 출력 경계를 명확히 한다.

## 개발자에게 전달할 작업 지시

당신은 이 저장소의 탭 4 `종합 리포트`를 수정하는 개발자입니다. 리포트 목록, reportId query 이동, 생성·로딩·fallback, 7개 하위 탭, 편집·미리보기·저장, PDF 전체·현재·선택 출력 기능은 유지하세요. 이번 작업의 핵심은 하위 탭끼리 같은 결론·근거·다음 과제를 반복해서 소유하지 않게 만드는 것입니다.

이번 작업의 화면 역할은 다음 한 문장으로 고정합니다.

> 검증된 위험의 의사결정 스냅샷을 만들고 상품화 검토·보장·약관·상품 구조·브리핑·근거를 역할별로 기록하는 화면이며, 탭 2·3의 원본을 조용히 덮어쓰는 화면이 아니다.

## 셀프 QA 결과 및 사실 확인

PDF의 권고를 현재 구현과 대조한 결과입니다.

1. 진입 흐름은 `ReportsPage → ReportPage → ReportSections`이며, `reportId` query로 목록과 상세를 오갑니다.
2. `REPORT_TABS`에는 `상품화 검토 요약`, `보장 공백`, `약관 검토`, `상품화 종합평가`, `상품 개발 제안`, `종합 브리핑`, `근거자료 및 추가 확인사항` 7개 하위 탭이 있습니다.
3. `ReportResult`는 `aiSummary`, `riskGapSummary`, `targetSuitability`, `productFeasibility`, `productProposal`, `wordingFeasibility`, `evidence`, `missingResearch`, `ui.briefing`을 한 객체에 둡니다. 이 구조는 풍부하지만 여러 곳이 결론 문장을 만들 수 있습니다.
4. `ReportMeta`에는 `sourceRiskId`, `generatedAt`, `schemaVersion`, `dataStatus`, `isMockData`가 있지만 명시적인 `sourceAsOf`·원본 평가 버전·근거 snapshot 버전은 충분하지 않습니다. 없는 값을 있는 것처럼 화면에 표시하지 말고 계약을 확장하세요.
5. 상품화 종합평가의 실무자 검토 저장과 종합 브리핑의 실무자 검토 저장은 리포트 content에 반영됩니다. 이 값이 탭 3의 원본 위험 상세와 자동으로 양방향 동기화되는 것으로 표현하면 안 됩니다.
6. 현재 `handleTabChange()`는 `editorMode`, `editorPreview`, `reviewInputDirty`가 있을 때 탭 변경 과정에서 draft를 저장된 리포트로 되돌릴 수 있습니다. 브라우저 이탈용 `beforeunload` 경고만으로는 탭 안 이동의 변경 보호가 되지 않습니다.
7. 현재 `ReportPdfDocument`는 선택된 하위 탭을 별도 렌더링하므로 웹 하위 탭과 PDF 출력 하위 탭의 정보 순서·open 상태·SAMPLE 표시가 어긋날 수 있습니다.
8. 이전 PDF의 “후속 과제 단일 상태” 권고는 현재 데이터에 담당·기한이 항상 있다는 뜻이 아닙니다. `missingResearch`에는 선택 필드가 있고 `BriefingContent.followUpTasks`와 `decisionChecks`는 별도 구조이므로 adapter와 미확정 fallback이 필요합니다.

## 수정 범위

우선 확인할 파일:

- `src/pages/reports/ReportsPage.tsx`
- `src/report/ReportPage.tsx`
- `src/report/components/ReportSections.tsx`
- `src/report/components/ReportEditorPanel.tsx`
- `src/report/components/GeneratedReportList.tsx`
- `src/report/types.ts`
- `src/report/services/report-list.ts`
- `src/report/services/briefing-content.ts`
- `src/report/api/resilient-report-proxy.ts`
- `src/report/api/report-proxy.ts`
- `src/report/report.css`

`src/domain/risk`의 원본 데이터를 변경해야 한다면 탭 2·3과의 snapshot 계약을 먼저 정의하고, 하위 탭 화면 안에 별도 결론 타입을 만들지 마세요. 공통 토큰과 다른 리포트 페이지 UI를 불필요하게 변경하지 않습니다.

## 반드시 구현할 내용

### 1. 하위 탭의 책임을 코드와 화면에 고정

현재 `REPORT_TABS`의 ID와 label은 유지하되, 각 탭이 소유할 질문을 명시합니다.

| 하위 탭 | 권위 질문 | 소유 데이터 | 다른 탭의 사용 방식 |
| --- | --- | --- | --- |
| `ai-judgment` 상품화 검토 요약 | 계속 검토할 것인가? | 리포트 결정 라벨·핵심 이유·대표 근거 | 1–3개 summary만 사용 |
| `coverage-gap` 보장 공백 | 기존 보험 적용 후 남는 손해는 무엇인가? | `riskGapSummary`와 연결 근거 | 상품 제안·약관은 링크/짧은 preview만 사용 |
| `wording` 약관 검토 | 보장·지급요건·면책을 문장으로 쓸 수 있는가? | `wordingFeasibility` | 보장 구조·상품 제안의 약관 관련 문구는 참조만 |
| `feasibility` 상품화 종합평가 | 보험성·시장성·데이터·약관·인수 게이트를 통과하는가? | `productFeasibility.assessment`와 실무자 review | 결론 상태·근거 ID·검토 상태만 소비 |
| `proposal` 상품 개발 제안 | 어떤 상품 구조·산출 가정으로 발전시킬 것인가? | `productProposal`과 proposal 계산/가정 | 상품화 결과를 제안으로 변환하되 승인으로 표현하지 않음 |
| `briefing` 종합 브리핑 | 회의에서 무엇을 결정하고 누가 후속할 것인가? | `ui.briefing`의 회의용 구조 | 상세 본문을 복사하지 않고 섹션·근거·과제 링크 사용 |
| `evidence` 근거자료 및 추가 확인사항 | 무엇을 근거로 삼았고 무엇이 부족한가? | `evidence`, `missingResearch` | 다른 탭은 ID·개수·상태만 preview |

구현 시 각 하위 탭의 제목·상태·설명·카드를 위 책임에 맞춰 검사하고, 같은 문장이 두 탭에서 길게 반복되면 source ID와 링크로 대체하세요.

### 2. 리포트 snapshot 계약 보강

현재 `ReportMeta`에 없는 값은 새로 생성해도 되지만, 실제 데이터가 없는 경우 SAMPLE/미확정으로 표시해야 합니다.

```ts
type ReportSnapshotMeta = {
  reportId: string
  sourceRiskId: string
  sourceAsOf?: string | null
  sourceAssessmentVersion?: string | null
  evidenceSnapshotVersion?: string | null
  generatedAt: string | null
  schemaVersion?: string
  dataStatus: 'live' | 'sample' | 'fallback' | 'stale'
  isMockData: boolean
}
```

- `reportId`는 리포트 버전 식별자이고 `sourceRiskId`는 원본 위험 식별자입니다. 두 값을 섞지 않습니다.
- `generatedAt`은 리포트 생성 시각, `sourceAsOf`는 원본 근거 기준 시각, `reviewedAt`은 실무자 검토 시각으로 구분합니다.
- 리포트 편집 후에는 report revision 또는 updatedAt을 갱신하고, 원본 위험 상세가 바뀌었다면 stale 경고를 표시합니다.
- 저장된 리포트와 fallback 리포트는 화면에서 동일한 “완료”처럼 보이지 않게 합니다.

### 3. 판정의 권위 원천과 파생 표시

다음 규칙을 코드에 적용합니다.

- 상품화 기준·게이트·실무자 검토 상태의 권위는 `productFeasibility.assessment`입니다.
- `aiSummary`는 핵심 결론의 서술형 요약이며, 상품화 기준 상태를 다시 계산하지 않습니다.
- `ui.briefing`은 회의용 편집 콘텐츠이며, `aiSummary`나 `assessment`를 조용히 덮어쓰지 않습니다.
- `riskGapSummary`, `wordingFeasibility`, `productProposal`은 각각 보장 공백·약관·상품 구조의 권위 데이터입니다.
- 서로 다른 섹션에서 결론 문구가 불일치하면 숨기지 말고 “snapshot 불일치/실무 확인 필요”를 표시하고 연결된 source field를 보여줍니다.
- 상태 라벨은 코드값과 표시 문구를 분리합니다. 예: `reviewable`, `needs_more_data`, `redesign`, `not_viable`.

### 4. 리포트 편집과 원본 위험의 경계

- 편집기는 현재 리포트 draft를 수정하며, 탭 3의 `SampleRiskDetail` 또는 LIVE 위험 상세를 직접 수정하지 않습니다.
- 탭 3에서 올라온 원본 판단을 리포트에서 수정할 때는 `reportOverride` 또는 변경 사유·작성자·시각을 남깁니다.
- 리포트 저장 API가 없는 fallback 환경에서는 “저장 API 미연결”을 표시하고 성공처럼 보이지 않게 합니다.
- 실무자 검토 저장은 낙관적 업데이트를 하더라도 실패 시 원복하고, 저장 상태·재시도·변경 시각을 표시합니다.
- `sourceRiskId`가 다른 리포트에 내용을 저장하지 않도록 저장 요청의 ID를 검증합니다.

### 5. 탭 변경 시 미저장 변경 보호

현재처럼 탭을 클릭하면 draft를 조용히 되돌리는 동작을 제거합니다. 다음 상태 머신을 구현하세요.

```text
clean                         바로 탭 이동
editor-dirty                  저장 / 변경 폐기 / 취소
review-input-dirty            실무자 입력 저장 / 변경 폐기 / 취소
save-in-progress              중복 이동·중복 저장 잠금
save-failed                   이동 중단, 오류·재시도 제공
```

- `ReportModal` 또는 동일한 접근 가능한 확인 모달을 사용합니다. 브라우저 native confirm만으로 구현하지 않습니다.
- 저장을 선택하면 현재 draft를 저장한 뒤 대상 탭으로 이동합니다.
- 변경 폐기를 선택하면 명시적으로 draft를 `savedReport`로 되돌린 후 이동합니다.
- 취소를 선택하면 현재 탭·편집 모드·포커스를 유지합니다.
- `hashchange`, `popstate`, 이전/다음 탭 버튼, 상단 탭 버튼 모두 같은 guard를 사용합니다.
- 편집이 없을 때는 어떤 확인창도 표시하지 않습니다.

### 6. PDF와 웹의 동일 정보 계약

- 웹에서 사용하는 하위 탭 데이터 selector와 PDF의 `ReportPdfDocument` selector를 공통화합니다.
- PDF는 선택된 하위 탭만 출력하되 원래 `REPORT_TABS` 순서를 유지합니다.
- PDF에는 표지의 `reportId`, `sourceRiskId`, 분석 기준일, 생성 시각, 근거 수, SAMPLE/fallback 상태를 표시합니다.
- `details`는 PDF에서 필요한 경우 자동으로 펼치고, 웹에서 숨겨진 `report-page__no-print` 액션은 PDF에 넣지 않습니다.
- PDF에서도 근거 ID·기준일·신뢰도·미확정·실무자 변경 사유가 누락되지 않아야 합니다.
- 웹과 PDF의 숫자 단위·상태 라벨·섹션 순서를 비교하는 검증 체크를 추가합니다.

## 금지 사항

- `aiSummary`, `productFeasibility.assessment`, `ui.briefing`에서 같은 최종 결론을 각각 새로 계산하지 마세요.
- 상품 제안의 AI mock 값·PML·보험료를 실제 확정값처럼 표시하지 마세요.
- 탭 4 편집이 탭 3 원본 데이터를 자동으로 덮어쓰게 만들지 마세요.
- 미저장 draft나 실무자 입력을 탭 변경 시 확인 없이 폐기하지 마세요.
- sourceRiskId를 제목·배열 index·현재 선택 탭으로 대체하지 마세요.
- 근거 상세 목록을 모든 하위 탭에 복사하지 마세요.
- PDF만 다른 문구·숫자·상태를 갖도록 별도 상수를 만들지 마세요.

## 완료 조건

- 7개 하위 탭의 질문·권위 데이터·preview 범위가 코드와 화면에서 일치한다.
- 리포트 생성 시 sourceRiskId/reportId/generatedAt/dataStatus/isMockData가 추적된다.
- 원본 위험 평가, 리포트 편집값, 브리핑 편집값의 경계와 변경 시각이 구분된다.
- 탭 변경·hashchange·popstate에서 미저장 변경이 저장/폐기/취소로 보호된다.
- 저장 API 성공·실패·미연결 상태가 사용자에게 정확히 표시된다.
- 리포트 목록에서 연 리포트의 reportId와 상세의 sourceRiskId가 일치한다.
- PDF 전체·현재·선택 출력에서 웹과 동일한 권위 데이터·상태·근거 ID가 나온다.
- 빈 리포트, fallback, stale source, 근거 없음, 저장 실패 상태가 각각 안전하게 표시된다.
- 기존 리포트 저장 데이터와의 backward compatibility 또는 migration 경로가 확인된다.

## QA 시나리오

1. 리포트 목록에서 서로 다른 reportId를 열고 URL·제목·sourceRiskId가 맞는지 확인합니다.
2. 각 하위 탭에서 동일한 위험명·결론·근거가 반복될 때 원천/preview 링크가 구분되는지 확인합니다.
3. 상품화 종합평가를 수정한 뒤 상품 개발 제안·종합 브리핑에 원본과 파생값이 어떻게 표시되는지 확인합니다.
4. 편집 모드에서 값을 수정하고 모든 탭 버튼, 이전/다음, hashchange, popstate를 실행해 저장·폐기·취소 모달이 정확히 동작하는지 확인합니다.
5. 저장 API 성공·실패·미연결을 각각 확인하고 실패 시 optimistic update가 원복되는지 확인합니다.
6. 리포트 기준일이 오래된 상태, sourceRiskId가 다른 저장 응답, evidence가 없는 리포트를 확인합니다.
7. 전체 PDF, 현재 탭 PDF, 선택 PDF를 생성해 웹과 제목·상태·수치·근거·SAMPLE 라벨이 일치하는지 확인합니다.
8. 모바일·키보드 접근성, 하위 탭 focus, modal focus trap, 인쇄 페이지 분할을 확인합니다.
9. `npm run lint`, `npm run build`, 관련 report 테스트를 실행하고 baseline 오류와 이번 변경 오류를 구분해 보고합니다.

## 개발 완료 보고 형식

1. 변경 파일 목록
2. 7개 하위 탭의 권위 데이터·preview 관계
3. Report snapshot metadata와 backward compatibility
4. 미저장 변경 보호 상태 머신
5. 리포트 원본과 탭 3 위험 상세의 저장 경계
6. 웹·PDF 정보 일치 QA 결과
7. empty/fallback/stale/save failure QA 결과
8. 테스트 결과와 남은 리스크
