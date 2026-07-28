# jh branch fourth-tab integration

The root report now uses the latest jh tab sequence and the same inner section order. The previous root implementation had only partially adopted the tab contract; it has now been reconciled with the jh report vertical slice.

1. 상품화 검토 요약
2. 보장 공백
3. 약관 검토
4. 상품화 종합평가
5. 상품 구조
6. 종합 브리핑
7. 근거자료 및 추가 확인사항

The root `ReportSections`, `ReportEditorPanel`, `GeneratedReportList`, report data contracts, briefing/evaluation services, and report stylesheet now follow the jh branch implementation. The root keeps only its stable `/reports` shell, list introduction, and same-origin resilient proxy boundary around that slice.

On the root shell, the detail tabs are positioned below the shared sticky topbar and the detail content reserves that tab-bar height, so selecting a report exposes the same sub-tab navigation immediately.

The fourth tab is a vertical review surface. Each criterion can show its AI summary, rationale, confirmed facts, missing information, linked source sections, evidence type, and next verification tasks. When the report content proxy is available, the reviewer can accept the AI result, edit it with a reason, enter additional material, defer the review, and save the result. Input changes are surfaced as pending re-analysis and are not silently applied to the AI result.

Validation: `npm run check` passed after the integration.
