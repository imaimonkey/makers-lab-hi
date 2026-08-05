# Article workflow restoration · 2026-08-06

## Scope

Restore the established curated risk examples after article-source integration and make the selected source-backed candidates available in the normal practitioner workflow.

## Current contract

- `/risks` renders the curated `riskExplorationRecords` workflow plus grouped article candidates selected by `isMeaningfulRiskCandidate`.
- `/developer-test/risks` remains an auxiliary source inspection route; it is not the only place where article-derived content is shown.
- Article detail data is built from `ArticleSourceRecord.contentProfile` and `derived.productConcept`, `coverageGap`, `facts`, `metrics`, and review actions.
- Article detail sections and the report link use the same `articleId`; curated EV keeps the existing report identifier.
- Dashboard core keywords are built from meaningful candidate articles and link to the normal `/risks` route; regulatory terms remain in the regulation evidence section.

## Cross-tab parity

- The normal dashboard combines curated candidates, meaningful article candidates, and the curated law queue in its KPI counts.
- The normal risk exploration route receives the same curated and meaningful article IDs used by the dashboard and detail route. The legal category renders the curated law queue plus article-derived law items, so it is not an empty state when the article queue is still loading.
- The report list keeps the detailed EV report first, then creates a complete report entry for every curated candidate and every grouped article report candidate. Curated entries reuse the article report section contract so summary, gap, feasibility, proposal, wording, evidence, and follow-up sections are all populated.
- Curated entries use `RPT-RISK-{detailRiskId}` and the same `detailRiskId` as `/risks/{riskId}`. They are review-only data and do not assert product approval, premium, coverage, or eligibility.

## Report depth parity

- Every report entry now passes through `report-depth-adapter.ts`, regardless of whether its source is a curated risk record or an article group. The adapter keeps the same evidence-led flow as the detailed EV case: event and context, damage path, affected parties, existing coverage, product structure, feasibility gates, wording review, source ledger, and follow-up questions.
- The minimum display contract is four summary cards, two next actions, seven confirmation questions, four damage rows, five coverage-map rows, five responsibility rows, five coverage gaps, ten feasibility items, eleven wording definitions, eight payment conditions, ten exclusion candidates, seven ambiguities, six reference documents, nine evidence items, and seven follow-up items.
- The wording layer is risk-specific rather than count-only: seven wording criteria, eleven definitions, eight payment conditions, ten exclusion candidates, and seven ambiguities are generated from each item's incident/event, covered loss, parties, existing insurance, underwriting evidence, and pricing evidence. Curated records inject their existing risk-specific narratives through `getRiskDetailNarrative()` before report generation. Article-derived records use the article's title-derived incident frame plus extracted facts, metrics, coverage gap, product concept, underwriting inputs, pricing inputs, and uncertainty instead of generic placeholder content.
- The full policy view now matches the EV reference depth for every non-EV item: seven common-policy sections with 42 numbered articles, plus three risk-specific special-clause proposals with ten articles and three decision checks each. The common articles cover purpose/definitions, payment and loss settlement, disclosure duties, contract maintenance, premium handling, termination/refund, and dispute/data safeguards. Special clauses bind their target, incident, loss focus, evidence, existing-insurance relationship, exclusions, limits, deductible, and unresolved questions instead of repeating a generic ten-line template.
- Only the EV reference report keeps the retrospective benchmark document; other items receive their own risk title, target, coverage gap, payment evidence, exclusions, existing-insurance relationship, and ten-article wording flow. The print and copy flows consume the same expanded structure.
- The original source evidence remains in the enriched evidence list with its IDs and source metadata; generated review rows are added around it for traceability. Mock/curated records remain visibly distinguishable through data metadata and are not presented as confirmed insurance terms or pricing.

## Verification

- `npm run check` passed on 2026-08-06.
- Wording parity audit: the EV reference contains 7 common-policy sections / 42 common articles and 3 special clauses / 10 articles each; the non-EV generator now emits the same 7 / 42 and 3 / 10 shape for every curated and article-derived report, while changing the text and evidence binding per report.
- Final source audit: `src/article` contains 35 source documents under four source folders; meaningful article groups resolve to 8 reportable risk topics after context-only documents and duplicate Swiss Re records are excluded.
- Final flow audit: dashboard and risk exploration expose 18 curated candidates plus 8 grouped article candidates; the report library contains 26 ordered cards including the EV benchmark, 17 other curated risks, and 8 article-derived reports. The legal view combines 5 curated law items with 7 grouped local source-law items.
- Category filtering now uses the canonical multi-category field, so a candidate assigned to more than one scope remains visible in each applicable category, including legal, individual, and corporate views.
- Practitioner wording screens no longer expose prototype/sample wording in the active risk-detail evidence ledger; source-backed review language is used instead. Developer-only routes and internal storage mode names remain implementation details.
- No commit or push performed.
