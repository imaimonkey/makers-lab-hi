# 0721 artifact-informed workbench restructure

Updated: 2026-07-21

## Why the previous pass was insufficient

The supplied smart-home reference is useful as an information-architecture reference, not as a color palette alone. Its strongest decisions are:

1. A narrow, consistently spaced icon rail keeps navigation visible without taking the main canvas.
2. The top bar has one job: context, search, and user controls. It does not repeat the workflow as another tab row.
3. The first content row is a welcome/summary card paired with a focused side card.
4. Lower cards are grouped by purpose: current devices, members, and consumption. Each card has a single reading task.
5. Typography is large enough to scan from a distance; secondary metadata is quieter but not microscopic.

## Workbench translation

| Reference pattern | Emerging-risk workbench translation |
| --- | --- |
| Icon rail | `RootLayout` and `SalesLayout` share a 112px icon-led rail. The active item is one white/pastel pill. Labels remain available through `aria-label`, `title`, and the hover callout. |
| Search/context header | The workbench top bar keeps the current area and a reserved search surface. The input is read-only and says “연동 예정” until a real search adapter exists. |
| Welcome hero | The radar page opens with a purpose card that explains the next action and links to candidates/reports. |
| Side focus card | The radar page highlights one representative candidate with signal strength, evidence count, and a direct detail link. |
| Device/status cards | Existing metric cards are retained for sample counts, but readable sizing and consistent card spacing make them supporting context rather than the main workflow. |
| Large central control | The integrated signal pipeline is placed before operational support cards. It carries issue register, process gates, trend, and law/regulation evidence in the order a product analyst needs to review them. |
| Members/consumption support | Source health, customer voice intake, and priority candidates are grouped below the pipeline as support queues. |

## Selected-tab connection

The active workbench item is connected to its interface in two ways:

- The active rail item uses a white tab body with a right-side bridge that crosses the navy rail boundary into the canvas. On mobile, the bridge is removed because the rail becomes horizontal.
- The top-bar context repeats the active item's semantic icon and label. This gives the user a second, content-side confirmation without creating another navigation tab.

The bridge is visual only; routing and active-state truth remain owned by `isNavigationItemActive()`.

## Workflow rule

The screen hierarchy should answer these questions in order:

- What changed and why should I care? (hero/focus)
- What needs a decision now? (pipeline gates and issue register)
- Which candidate do I open next? (priority queue and candidate route)
- Are the sources and customer signals trustworthy enough? (source health and aggregation note)
- How do I preserve the decision? (reports route)

The four steps remain a domain workflow, not a second global tab bar. Routing and active-state behavior stay in `src/shared/config/navigation.ts` and `isNavigationItemActive()`.

## Typography and accessibility floor

- Primary page titles: 36px or larger on desktop, 34–36px on mobile.
- Section headings: 18–24px.
- Body/supporting copy: 11–14px; no new 7–8px text in the workbench v2 layer.
- Icon-only navigation must retain an accessible label and visible hover discovery.
- Sample data and read-only adapters remain explicitly marked.
