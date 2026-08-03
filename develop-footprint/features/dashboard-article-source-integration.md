# Dashboard article-source integration

## Current slice

- Dashboard blocks use a compact Hi Navy/Hi Orange workboard treatment: signal-toned KPI cards, consistent panel edges, and interactive keyword/source tiles. Existing shared brand tokens are reused; no new global token was added.

- Developer dashboard fallback reads the PDF originals under `src/article/` in the browser. Practitioner routes never read those originals or their derived reports; when their API is unavailable they remain on the separately labeled `SAMPLE` fixture.
- Dashboard keyword links now use the catalog's canonical `q`/`category`/`sort` query contract, and screening searches match titles, summaries, tags, categories, actions, facts, and metric labels.
- PDF text is extracted through the shared `src/features/llm-util/fileContext.ts` parser.
- The derived snapshot exposes source file, extracted character count, collection time, article count, candidate count, and review-gate status.
- `articleSourceData.ts` now maps the article body into a display-only structured result: facts, affected targets, damage types, metrics, evidence quotes, coverage gaps, uncertainty, and next action.
- The developer workbench uses this content-derived fixture when saved Step 2 rows are absent, while saved non-mock Step 2 rows still take precedence.
- The final report tab now builds one content-derived report per article file, including body metrics, evidence quotes, coverage-gap hypotheses, uncertainty, counter-evidence, and next actions; it is explicitly labeled `CONTENT-DERIVED SAMPLE`. The pre-existing full EV fire/battery `SAMPLE` report remains in the list as a separate preserved entry.
- Candidate records remain review-gated; a single article does not auto-promote to a confirmed risk or product decision.
- Step 2 prompt documents remain the contract for candidate-card, screening, evidence, and queue semantics. AI enrichment is intentionally shown as pending until a server-side generation result is available.

## Fallback semantics

When the dashboard APIs are unavailable, the UI uses `CONTENT-DERIVED SAMPLE` status for the PDF-derived snapshot. It does not label this as live API data or as a finalized AI judgment. The metrics and scores are the presentation shape of a structured result, not a real model call or product decision. If PDF extraction fails, the source stays in the review queue; `law74.hwp` is connected as an asset but remains `본문 추출 대기` until a server-side HWP3 adapter is available.

## Next dependency

Connect the server-side Gemini enrichment endpoint to the extracted article bundle and persist versioned prompt/result/evidence IDs before replacing the content-derived fixture with model output. Add a server-side HWP3 extraction adapter for `src/article/law74.hwp` and retain the same uncertainty/review gate contract.
