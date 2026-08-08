# ADR-006 — Deterministic Matching Engine Architecture

Status: **CONFIRMED** (pipeline shape and non-negotiable constraints) with
**[OPEN-ARCH]** scoring-formula details deliberately left for Phase 4
schema-aligned work. See `/docs/matching/matching-architecture.md` for the
full analysis; this ADR records the decision in the standard ADR shape.
Date: 2026-08-08

## Context

Phase 0 Decision 3 established a hard, non-negotiable constraint: the
matching engine must be deterministic and rule-based, with zero AI
dependency in its critical path, and every result must be explainable —
never a bare score. This ADR records the resulting architecture as a
decision, not just an analysis.

## Decision

A four-stage pipeline, run identically in both matching directions
(applicant→properties and property→applicants):

1. **Hard-constraint filter** — every MUST_HAVE criterion is evaluated as
   a binary gate; any failure excludes the candidate before scoring.
   Pushed as close to the database query as possible for performance.
2. **Per-criterion evaluation** — IMPORTANT and PREFERRED criteria are
   evaluated against their value type (exact, range, approximate,
   location, amenity/boolean, restriction). IGNORE criteria are skipped
   entirely, not scored as zero.
3. **Weighted score aggregation** — IMPORTANT criteria carry more weight
   than PREFERRED; exact weights and partial-match tapering are
   **[OPEN-ARCH]**, deferred to be designed alongside the Phase 4 schema
   (see `/docs/database/conceptual-data-model.md`), since the formula's
   inputs depend on how ranges/tolerances are represented in the schema.
4. **Explanation assembly** — every match result carries matched,
   partially-matched, mismatched, and ignored criteria, plus which
   MUST_HAVE constraints were satisfied, as a structured result produced
   directly by stages 1-3 — never reconstructed after the fact from a bare
   score.

An optional future natural-language input layer, if ever built, is
architecturally a pre-processing step that runs entirely before stage 1 and
produces the same structured criteria a manual entry would — the pipeline
itself has no knowledge of whether its input came from manual entry or a
confirmed NL-assisted proposal.

Structured conditional criteria (e.g. "if the property has a pool, ignore
bedroom count, area, and price") are supported via explicit
`IGNORE_WHEN`-style conditional criterion records — see
`/docs/matching/matching-architecture.md` §"Conditional / free-text-derived
requirements" for the full design, added in this Phase 4 pass.

## Alternatives considered

- **A scoring model with AI/ML-assisted weighting** — rejected outright by
  Phase 0 Decision 3; not re-litigated here.
- **A single-pass evaluator with no separate hard-constraint stage** —
  rejected: would either apply full scoring logic to candidates that
  should have been excluded outright (wasteful and semantically wrong for
  MUST_HAVE), or would require re-deriving which failures were
  "disqualifying" vs. "score-reducing" after the fact, which is exactly
  the ambiguity the four-stage separation avoids.
- **Deriving the explanation from the score after the fact** (e.g.
  re-running comparisons lazily when a user requests detail) — rejected:
  risks the explanation and the score drifting out of sync if either is
  computed by different code paths, and cannot guarantee the "never a bare
  score" requirement if explanation generation is optional/deferred.

## Rationale

The four-stage shape maps directly onto the priority model
(MUST_HAVE/IMPORTANT/PREFERRED/IGNORE) already confirmed in product
requirements, keeps the explanation structurally inseparable from the
score (satisfying the explainability requirement by construction, not by
convention), and isolates the one genuinely unresolved piece (exact
scoring weights) so it doesn't block finalizing everything else.

## Consequences

- The engine's core logic (stages 2-4 especially) should be plain,
  platform-agnostic code with no UI or platform-SDK dependency, fully unit
  testable in isolation — directly supporting the product's "extensive
  edge-case tests" expectation.
- A `Match` record must never be persisted without its corresponding
  `MatchExplanation` — enforced at the data-model level (same transaction),
  per `/docs/database/conceptual-data-model.md`.
- Weights must be represented as data (configurable), not hardcoded
  constants, even though their specific values are not fixed yet — so
  future tuning doesn't require a code change.

## Security implications

None beyond the existing constraint that no AI API call is ever made in
the critical scoring path — there is no external data exposure risk here
because the engine runs entirely locally on data already inside the app's
own encrypted database (`ADR-005`).

## Performance implications

Stage 1's SQL-pushable filtering is the primary large-dataset performance
lever (see `04-final-architecture.md` §Performance for concrete
expectations at 100/1,000/10,000/50,000 records). Stages 2-4 operate only
on the post-filter candidate set, which should be small relative to the
full dataset in typical use — an assumption to validate empirically once
real data volumes exist.

## Status

**CONFIRMED** for the pipeline shape, priority semantics, and
explainability requirement. **[OPEN-ARCH]** for the exact scoring formula
and weight values — tracked in
`/docs/architecture/unresolved-decisions.md`, to be resolved alongside
Phase 4 schema finalization, not silently defaulted to arbitrary numbers.
