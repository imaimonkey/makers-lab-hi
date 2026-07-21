# 0721 workstream integration

Updated: 2026-07-21

This branch keeps `0718-backup` unchanged and absorbs the three available workstreams as feature slices on top of `0721-backup`.

| Remote workstream | Integrated surface | Current adapter | Deferred |
| --- | --- | --- | --- |
| `origin/hyoje` | Risk radar dashboard | `src/domain/risk/riskRadarDemo.ts`, `src/features/risk-dashboard/RiskSignalPipeline.tsx` | Live feeds, source-health API, candidate promotion API |
| `origin/seoyeon` | Risk candidate exploration | `src/domain/risk/riskExplorationDemo.ts`, `src/features/risk-catalog/RiskExplorationLens.tsx` | Official law/data feeds, underwriting model, persistent comparison state |
| `origin/jh` | Report generation and review | `src/report/**`, `report-reference/**`, embedded in `ReportsPage` | GAS/API proxy, SSO/RBAC, report persistence |

## Integration rules

- The stable routes remain `/`, `/risks`, `/risks/:riskId`, `/reports`, `/customer-insight`, and `/sales-intake`.
- Old branch-level layouts and sidebars are not copied into the current app. Pages remain composition layers; cross-team behavior lives under `features` and `domain`.
- All imported numbers and decisions are explicitly sample/demo data. They are not insurance coverage, premium, eligibility, or legal conclusions.
- Radar and exploration links return to the existing candidate route. A candidate is not automatically promoted from one customer signal or one article.
- The report slice uses a local fallback generator. Production generation, storage, access control, and audit logging must be supplied behind `ReportProxy`.
- Any future API adapter must preserve the shared evidence IDs, source timestamps, uncertainty/warnings, and `ApiEnvelope` contract.

## Verification

`npm run check` passes on this branch. Vite may print the existing advisory about the main bundle exceeding 500 kB; this is not a build failure.

