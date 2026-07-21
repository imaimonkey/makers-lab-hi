# 0721 integration QA

Date: 2026-07-21

## Automated

- `npm run check` — pass (ESLint, TypeScript build, Vite build).
- `git diff --check` — run before commit.

## Interaction checklist

- `/`: risk radar renders the existing dashboard plus the sample signal pipeline; audience tabs filter the issue register without changing navigation state.
- `/risks`: existing candidate search/status filters remain available; the comparison lens filters by individual, corporate, legal/regulatory, department, and customer signal, searches by title/tag, and opens a selected-candidate detail panel.
- `/reports`: the existing report library remains visible; the integrated report generator starts in an idle state, generates a local fallback report, and keeps API actions behind `ReportProxy`.
- `/customer-insight` and `/sales-intake`: not moved into the workbench sidebar and not changed by the workstream slices.
- Responsive layout: pipeline and comparison cards collapse at 980px/720px; comparison table uses a bounded horizontal scroller instead of widening the page.
- Sample labeling: imported metrics, scores, law cards, and report output carry `SAMPLE`/`검토용` labels or the surrounding sample notice.

## Remaining manual/demo checks

- Verify one candidate row from the pipeline navigates to `/risks` and that only the destination navigation item is active.
- Generate a report, inspect the fallback warning, then use the reviewer draft controls and confirm local storage is used only for the demo.
- Test keyboard focus for audience/category tabs, candidate selection, report buttons, and the mode dropdown.

## Reference simplicity pass

- Removed the duplicate top stage rail and dashboard work-queue cards.
- The left navigation is the only work-stage navigation surface; the top bar remains contextual (title, profile, and mode switch).
- At desktop and mobile widths, verify that the top bar is not interpreted as a second tab bar.
- The rail now follows the supplied artifact's icon-led pattern; labels are preserved for assistive technology and hover discovery.
- The radar dashboard now uses a hero/focus two-card opening before the metric and evidence panels.
- Workbench v2 check: the radar pipeline is ordered before source/customer support queues, and the legacy duplicate trend card was removed from the dashboard shell.
- Readability check: workbench v2 raises page, section, table, form, and queue text floors; mobile overrides restore a horizontal icon rail and single-column workflow.
- Selected-tab connection check: the active rail stays a compact pill and a thin colored connector reaches the page kicker; no detached bridge fragment is rendered. The matching top-bar context icon is a visual affordance only; route truth remains a single `aria-current="page"`.
