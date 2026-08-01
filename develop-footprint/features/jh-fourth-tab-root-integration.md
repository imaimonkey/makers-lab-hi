# jh branch fourth-tab integration

The root report now uses the latest jh tab sequence and the same inner section order. The previous root implementation had only partially adopted the tab contract; it has now been reconciled with the jh report vertical slice.

1. 종합 브리핑
2. 상품화 종합평가
3. 보장 공백
4. 약관 검토
5. 상품 개발 제안
6. 근거자료 및 추가 확인사항

The root `ReportSections`, `ReportEditorPanel`, `GeneratedReportList`, report data contracts, briefing/evaluation services, and report stylesheet now follow the jh branch implementation. The root keeps only its stable `/reports` shell and same-origin resilient proxy boundary around that slice.

On the root shell, the detail tabs are positioned below the shared sticky topbar and the detail content reserves that tab-bar height, so selecting a report exposes the same sub-tab navigation immediately.

The fourth tab is a vertical review surface. Each criterion can show its AI summary, rationale, confirmed facts, missing information, linked source sections, evidence type, and next verification tasks. When the report content proxy is available, the reviewer can accept the AI result, edit it with a reason, enter additional material, defer the review, and save the result. Input changes are surfaced as pending re-analysis and are not silently applied to the AI result.

Validation: `npm run check` passed after the integration.

## 2026-08-01 UI behavior update

- The report sub-tab bar remains visible near the top initially, collapses upward after 72px of downward scrolling, and reveals again after a small upward scroll from any page position.
- The behavior is implemented in `src/report/components/ReportSections.tsx` and `src/report/report.css`; tab selection, hash restoration, and keyboard navigation remain unchanged.
- The `최종 검토 결론` checklist now uses the same green `✓` icon and body text color for the additional data-check sentence; card layout and report data remain unchanged.
- The first-tab `핵심 판단 근거` cards now share a white card surface, thin orange top line, orange decision text, teal metric text, and short check bullets. The third card and fourth-tab `국내 출시 현황·신규성 검토` read the same `productProposal.noveltyAnalysis` object; the card moves the reviewer to the detailed section and pending data is shown without fabricated insurer/product rows or zero counts.
- The fourth-tab evaluation now places the `MARKET LAUNCH & NOVELTY` section after `핵심 정량지표` and before the 12 criteria. It includes the pending empty state, data-driven comparison table, novelty reasons, limitations, official source links, actual checked dates, mobile overflow, and print-safe row/table rules. The previous `실제 상품화 사례` wording is replaced by `국내 출시 현황·신규성` / `국내 출시 현황 및 차별화 가능성` in the applicable judgment surfaces.
- The summary cards now keep only two short check bullets each with equal card height and aligned links. The completed EV mock uses four official-source comparison rows (DB손해보험, KB손해보험, 현대해상, 삼성화재); the detailed table presents six decision-focused columns and keeps insurer/product/source detail out of the summary card.
- The redundant `상품화 판단 핵심 근거` block was removed from the visible fourth-tab flow. `국내 출시 현황·신규성 검토` now exposes one compact judgment/count panel first, with comparison, reasons, and sources behind collapsed accordions. The summary-card link sends a comparison-open request while switching to the fourth tab; print mode expands all three detail bodies.
- The EV prototype novelty payload is now an explicit completed analysis: `ev-underground-parking-fire`, checked `2026-08-01`, four reviewed insurers, four related product/rider rows, no fabricated zero for direct matches, and two differentiated gap signals. The summary card and detailed evaluation continue to normalize the same `productProposal.noveltyAnalysis` object.
- When saved report content is loaded, a completed source/mock novelty analysis is retained if the saved payload is missing the field or still carries the old pending state; a saved completed analysis remains authoritative. This prevents stale storage fallback from reverting the EV prototype to the pending screen.
- The third first-tab novelty card now uses the short judgment `차별화형 · 통합보장 차별화 필요`; its title, summary, wrapped check bullets, and bottom link remain in normal flow so long Korean text expands the card without overlap.
- The `국내 출시 현황·신규성 검토` summary panel now uses the shared report navy/orange/teal/neutral palette; its right-side facts use a stable 2×2 grid so `직접 대응 통합상품` and `확인 범위에서 미확인` remain readable on desktop, mobile, and print.
- The briefing `핵심 검토 결과` cards now map their display-only result labels to `보장 공백 확인`, `상품 개발 가능`, `단체계약형 적합`, and `약관 반영 가능`; source card data, check lines, navigation tabs, and links remain unchanged.
- The first-tab core judgment bullets now keep teal only on the check icon; the bullet copy uses the shared navy body color so metric hierarchy remains clear across all three cards.
- The executive briefing now removes the repeated finance-note sentence, inserts a compact risk-context strip sourced from `riskGapSummary` with a link to the existing risk-summary tab, clarifies decision/action roles, and reduces the evidence section to source metadata plus concise additional-material status.
- The next operational dependency is unchanged: the report shell still needs the production report storage, permissions, and audit-log boundary described above.

Validation: `npm run check` passed after the completed EV novelty data update.

## 2026-08-01 briefing consolidation

- The former `상품화 검토 요약` first tab is now the single first `종합 브리핑` tab. Its internal order is conclusion, three core judgment cards, risk context, evaluation status, product direction, quantitative indicators, product detail, decisions/actions, evidence status, and practitioner review.
- The three core judgment cards and the evaluation-status block reuse the existing product-review summary data. The lower briefing area now restores all four core review result cards in the original coverage-gap, productization, recommendation-structure, and wording-feasibility order.
- The briefing conclusion keeps only `필수 기준` and `전체 기준` state cards. The risk-context link now targets the existing `보장 공백` detail tab, and the novelty card keeps its existing comparison-opening navigation into `상품화 종합평가`.
- The removed standalone summary is also removed from the report tab list and PDF section renderer. PDF output now starts with the integrated briefing and keeps its section order; the previous `AI 원본 포함` option was removed because there is no separate AI-summary section to export.
- The existing before-print handler still opens report details for printing and restores their prior state after printing, so expanded evidence/detail content remains available in PDF output without changing on-screen disclosure state.
- The integrated briefing now applies one scoped visual system across absorbed summary blocks and existing briefing sections: navy body/title text, orange conclusions and decision lines, teal confirmed values/checks, blue links, shared neutral borders, and consistent card rhythm. The previous green finance surface, purple status emphasis, and brown result accent are overridden for this page only, with matching mobile and print rules.
- The report navigation and PDF section order are now `종합 브리핑 → 상품화 종합평가 → 보장 공백 → 약관 검토 → 상품 개발 제안 → 근거자료`.
- The reports home now starts directly at `REPORT LIBRARY`; the outer page header, generation intro, and status overview cards were removed while report search, filters, view toggles, and card actions remain available.
- The integrated briefing now starts with `검토 대상 위험`, followed by the conclusion, core judgment, core review result, and financial indicator blocks; `상품화 평가 현황` follows the financial block and precedes the recommendation detail. Existing anchors and links remain unchanged.
- The briefing PDF now uses a restrained company-report print treatment: screen cards remain unchanged, while quantitative indicators, product structure, and decision/action content render as bordered tables with controlled wrapping and page-break rules.
- The briefing section after `핵심 정량 지표` now restores the four-card `CORE REVIEW RESULTS / 핵심 검토 결과` layout. It keeps the existing coverage, feasibility, recommendation, and wording data, uses the requested display result labels, routes feasibility to the required-criteria anchor and recommendation to the product-detail section, and remains a 2×2 desktop / 1-column mobile grid.
- The shared report header now starts directly with the report title; the top status/category badges, `INSURANCE PRODUCT REVIEW` eyebrow, disclaimer banner, and `위험 ID` are removed while `분석 기준일`, `생성일시`, and `근거자료` remain in a compact three-column metadata row.
- The integrated briefing conclusion card now uses a thin light blue-gray left accent (`#c5dced`) that matches its light-blue gradient instead of the high-contrast orange strip; the PDF rule uses the same accent.
- The `핵심 정량 지표` panel now uses the same light blue-gray accent and a restrained pale-blue gradient, while its four metric cards remain white for readable emphasis; PDF output keeps the panel white with the matching accent.
- The screen `핵심 정량 지표` panel is now white again, with only the four inner metric cards using a very light blue-gray surface (`#f8fbfe`); PDF table output remains white.
- The four-card `핵심 검토 결과` block now follows `핵심 판단 근거` immediately in both screen and PDF section order; evaluation status, risk context, and financial indicators follow afterward.
- PDF print mode now renders both `핵심 판단 근거` and `핵심 검토 결과` as bordered report tables with fixed column proportions, controlled Korean wrapping, teal check marks, and row-level page-break protection; the screen card grids remain unchanged.
- PDF action tables now keep the `우선 실행 과제` block and each table together when there is not enough space at the bottom of a page, repeat table headers when a browser must continue a table, and keep the evidence/reviewer blocks from being separated by the action-table break.
- The risk context block is now titled `검토 대상 위험` with the `RISK OVERVIEW` kicker and appears directly below the briefing heading; the three core blocks use slightly tighter spacing while retaining their independent section cards.
- The PDF cover no longer shows the redundant `상품화 검토 리포트` subtitle; the report title and cover metadata remain unchanged.
- The top briefing hierarchy now keeps `검토 대상 위험` as a compact white information bar, reduces the conclusion card to a quiet white/blue surface with a navy accent, and weakens the outer `핵심 판단 근거` container so the three inner cards carry the visual emphasis; screen, responsive, and PDF rules are aligned.
- The `상품화 평가 현황` body now reuses the existing twelve criterion records as individual status cards in a six-column desktop grid. The cards expose the criterion name and its current `충족`, `보완 필요`, `추가 확인`, or `불충족` state with scoped teal, amber, purple, or red accents; the grid collapses responsively and keeps the same six-column layout in print/PDF output.
- The report header and PDF cover now display the risk title without the redundant `상품화 검토 리포트` suffix; the stored report metadata remains unchanged.
- The integrated `종합 브리핑` no longer renders the separate `실무자 검토` block; the rest of the briefing and other-tab review controls remain unchanged.
- The `추천 상품 구조` block now presents 상품명·계약 형태 as aligned headline cards, the five detail facts as a two-column report-style label/value table, and the wording preview as a separate ivory-orange callout with its link in the preview header; the PDF table keeps the same information order and highlights the two headline rows.
- Validation: `npm run build` and `git diff --check` passed. `npm run check` remains blocked by seven pre-existing unused-variable lint errors in `src/features/risk-dashboard/articleSourceData.ts`.
