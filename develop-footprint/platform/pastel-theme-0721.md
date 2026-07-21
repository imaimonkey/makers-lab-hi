# 0721 pastel smart-dashboard theme

Updated: 2026-07-21

The 0721 UI keeps the approved Hi Navy (`#00205b`) and Hi Orange (`#ff9e1b`) as brand anchors, then adds a soft pastel system for the demo/workbench surfaces.

## Tokens

- Canvas: `--canvas: #f7faff`
- Pastel accents: `--pastel-blue`, `--pastel-mint`, `--pastel-lilac`, `--pastel-peach`, `--pastel-yellow`
- Surface: white with `--shadow: 0 18px 48px rgba(33, 73, 111, .08)`
- Corner language: 13–22px cards, pill filters, and rounded status chips

## Usage rules

- Use Hi Navy for navigation, headings, primary actions, and decision anchors.
- Use Hi Orange sparingly for emphasis, sample labels, active rails, and attention states.
- Use pastel fills only as low-contrast grouping surfaces; never rely on color alone for status.
- Keep the customer and sales scenes visually distinct from the workbench while sharing the same token family.
- Do not add new logos, official fonts, or unsupported product/coverage claims for visual polish.

The implementation lives in `src/styles/global.css` and `src/report/report.css`. This is a visual-only layer; routes, storage contracts, and interaction state remain unchanged.

## Artifact-informed information architecture

The supplied smart-home dashboard reference informs the interaction layer without adding a second navigation surface:

- The analyst and sales layouts use a narrow icon-led rail as the source of truth; the active item is a single white/pastel pill and labels remain available through `aria-label`/native hover titles.
- The top bar follows the reference's search/context/profile rhythm. The search field is explicitly read-only until a real search adapter is connected, so the prototype does not imply a working index.
- The dashboard opens with a two-card overview (welcome/action + focus candidate), then moves into metrics and evidence panels. This mirrors the reference's hero-plus-side-card composition while retaining the risk workflow.
- Candidate rows, customer anchors, and mode choices use small icons only where they improve scanning; page headers remain text-first and quiet.
- The primary sidebar remains the single current-page announcement (`aria-current="page"`).
