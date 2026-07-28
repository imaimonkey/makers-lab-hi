# Dashboard article-source integration

## Current slice

- Dashboard fallback reads the PDF originals under `src/article/` in the browser.
- PDF text is extracted through the shared `src/features/llm-util/fileContext.ts` parser.
- The derived snapshot exposes source file, extracted character count, collection time, article count, candidate count, and review-gate status.
- Candidate records remain review-gated; a single article does not auto-promote to a confirmed risk or product decision.
- Step 2 prompt documents remain the contract for candidate-card, screening, evidence, and queue semantics. AI enrichment is intentionally shown as pending until a server-side generation result is available.

## Fallback semantics

When the dashboard APIs are unavailable, the UI uses `LOCAL ARTICLE` status for the PDF-derived snapshot. It does not label this as live API data or as a finalized AI judgment. If PDF extraction fails, the existing sample fallback remains visible with its source status.

## Next dependency

Connect the server-side Gemini enrichment endpoint to the extracted article bundle and persist versioned prompt/result/evidence IDs before replacing the remaining issue, trend, law, and product-readiness demo cards.
