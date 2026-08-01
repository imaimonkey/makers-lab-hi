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
