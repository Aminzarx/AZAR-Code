# Matching Engine — Conceptual Architecture

Status: DRAFT — Phase 3 architectural analysis. Designs the conceptual shape
of the engine; does **not** finalize the scoring formula (explicitly deferred
pending Phase 4's data model) and does **not** write implementation code. This
document supersedes nothing in `/docs/01-product-requirements.md` §9 or the
MATCH/MEXP user stories — it explains *how* those confirmed requirements can
be satisfied, conceptually.
Date: 2026-08-08

## Non-negotiable constraints (restated, not re-litigated)

**[CONFIRMED — Phase 0 Decision 3]** Deterministic, rule-based, zero AI
dependency in the core engine. Supports MUST_HAVE/IMPORTANT/PREFERRED/IGNORE
priorities, hard constraints, exclusions, numeric ranges, exact values,
approximate values, location, amenities, weighted scoring, two-way matching,
and full explainability (matched/mismatched/ignored criteria + critical
requirements, never a bare score). **[CONFIRMED — Phase 0 Decision 4]** Runs
entirely locally, on-device, with no network dependency (§4a: matching is
OFFLINE).

## Conceptual pipeline

```
 Applicant's structured requirements          Candidate property's
 (per-criterion: value/range +                structured fields
  priority: MUST_HAVE/IMPORTANT/
  PREFERRED/IGNORE)
        │                                            │
        └───────────────────┬────────────────────────┘
                             ▼
                 ┌─────────────────────────┐
                 │  Stage 1: Hard-Constraint │
                 │  Filter (MUST_HAVE only)  │
                 │  — SQL-pushable, per      │
                 │  local-data-architecture  │
                 └───────────┬──────────────┘
                             │  (candidates that pass
                             │   every MUST_HAVE check)
                             ▼
                 ┌─────────────────────────┐
                 │  Stage 2: Per-Criterion   │
                 │  Evaluation (IMPORTANT,   │
                 │  PREFERRED — IGNORE is    │
                 │  skipped entirely)        │
                 └───────────┬──────────────┘
                             ▼
                 ┌─────────────────────────┐
                 │  Stage 3: Weighted Score  │
                 │  Aggregation              │
                 └───────────┬──────────────┘
                             ▼
                 ┌─────────────────────────┐
                 │  Stage 4: Explanation     │
                 │  Assembly (matched /      │
                 │  mismatched / ignored /   │
                 │  critical)                │
                 └───────────┬──────────────┘
                             ▼
                  Ranked, explained match
                        result set
```

## Stage 1 — Hard-constraint filter

- Evaluates every criterion an applicant has marked **MUST_HAVE** against a
  candidate. Any failure excludes the candidate entirely, before any scoring
  happens — directly implementing MATCH-03's worked example (pool =
  MUST_HAVE excludes non-pool properties outright, regardless of how well
  they'd otherwise score).
- **Architectural note**: this stage should be pushed as close to the
  database query as possible (per `/docs/local-data/local-data-architecture.md`)
  so large datasets are narrowed before the more expensive scoring stage runs
  — a performance-driven design choice, not a correctness one (correctness
  would hold even if this ran in application code after fetching everything;
  it just wouldn't be fast at scale).

## Stage 2 — Per-criterion evaluation

For each remaining candidate, each non-IGNORE, non-MUST_HAVE criterion
(IMPORTANT, PREFERRED) is evaluated against its **value type**:

| Value type | Evaluation concept |
|---|---|
| Exact value | Match / no-match on equality (e.g. exact bedroom count). |
| Numeric range | Match if within range; degree of match may taper near range edges rather than being strictly binary (an "approximate" variant of range matching). |
| Approximate value | Match within a defined tolerance band around the target value (e.g. "around 90 sqm" — tolerance itself is a Phase 4/scoring-formula detail, not fixed here). |
| Location | Match by structured location hierarchy (neighborhood/area) and/or proximity, not free-text string comparison. |
| Amenities/boolean flags | Match / no-match on presence. |
| Restrictions/exclusions | A restriction failing is treated as an exclusion for that specific criterion's contribution (not necessarily a hard MUST_HAVE-style exclusion of the whole candidate, unless the applicant also marked it MUST_HAVE) — the distinction between "restriction" and "MUST_HAVE" from Phase 1 §8.1 is preserved here as two related but distinct mechanisms. |

IGNORE criteria are **not evaluated at all** in this stage — not evaluated
and scored as zero, genuinely skipped, so they can never appear as
"mismatching" in the explanation (directly satisfying MEXP-01's requirement).

## Stage 3 — Weighted score aggregation

- **[OPEN-ARCH — explicitly deferred, per instruction not to finalize the
  scoring formula]** The exact weighting between IMPORTANT and PREFERRED
  criteria, how partial/approximate matches contribute a fractional score,
  and how the overall score is normalized (e.g. 0-100) are not fixed in this
  document. What *is* architecturally fixed, because it follows directly from
  confirmed requirements rather than being a formula detail:
  - MUST_HAVE criteria contribute no "score" at Stage 3 at all — they were
    already binary gates at Stage 1. A candidate either passed all of them
    (and is in the scored set) or was already excluded.
  - IGNORE criteria contribute nothing (weight zero, effectively absent).
  - IMPORTANT criteria must carry more scoring weight than PREFERRED criteria
    — the relative ordering is confirmed by the priority model itself even
    though the exact numeric weights are not.
- **Recommendation for Phase 4**: define the scoring formula alongside the
  conceptual data model (`/docs/database/conceptual-data-model.md`), since the
  formula's inputs (how ranges/approximate tolerances are represented) are a
  data-modeling question as much as an algorithm question — sequencing them
  together avoids designing a formula around a schema that doesn't actually
  support it.

## Stage 4 — Explanation assembly

- **[CONFIRMED, non-negotiable per Phase 0 Decision 3]** Every match result
  must carry, alongside the score: the list of matched criteria, mismatched
  criteria, ignored criteria (those marked IGNORE, explicitly listed as
  ignored rather than omitted — so the user can see the applicant chose to
  ignore them, not that the system forgot to check), and which criteria were
  critical (MUST_HAVE) and were satisfied to make this candidate eligible at
  all.
- **Architectural implication**: the explanation cannot be reconstructed after
  the fact from just a stored score — it must be produced *as a structured
  result* by Stages 1-3, not derived by re-running the match later. This
  favors persisting the explanation itself (or enough structured detail to
  reconstruct it deterministically) alongside the match record, which is a
  direct input into the conceptual `Match`/`MatchExplanation` entities in
  `/docs/database/conceptual-data-model.md`.

## Two-way matching

- **[CONFIRMED]** The same four-stage pipeline runs in both directions:
  "given this applicant, rank properties" and "given this property, rank
  applicants." Architecturally, this means the engine's core logic should be
  written generically over "requirement set" and "candidate," not
  hard-coded to one direction — when running property→applicants, the
  "requirement set" role is filled by each applicant's structured
  requirements in turn, and the "candidate" role is filled by the one fixed
  property. This is the same pipeline, invoked with roles swapped, not a
  second implementation.

## Conditional / free-text-derived requirements (new in Phase 4)

Agents sometimes think about requirements conditionally — the Phase 4 brief
gives a concrete example: "اگر استخر داشته باشه تعداد خواب و زیربنا و
قیمت مهم نیست" ("if it has a pool, bedroom count, floor area, and price
don't matter"). The wrong way to support this is to depend on natural-
language processing to interpret sentences like that at matching time —
that would put an unreliable, unexplainable step in the critical path of a
system whose entire value proposition is determinism and explainability.
The right way, and the one this architecture adopts, is to give the
**structured** requirement model enough expressiveness that a user (or a
future, clearly-bounded NL-assist layer per the section below) can
represent the same idea directly:

```
RequirementCriterion(field=pool, priority=MUST_HAVE)
RequirementCriterion(field=bedrooms, priority=IMPORTANT,
                      suppressedBy=[pool-criterion])
RequirementCriterion(field=area, priority=IMPORTANT,
                      suppressedBy=[pool-criterion])
RequirementCriterion(field=price, priority=MUST_HAVE,
                      suppressedBy=[pool-criterion])
```

- **Mechanism**: each `RequirementCriterion` may optionally name one or
  more *other* criteria on the same applicant that it suppresses when its
  own condition is satisfied for a given candidate. "Satisfied" here means
  the same evaluation Stage 1/2 would already perform for that criterion
  on its own (e.g. the pool criterion evaluates true for this candidate
  property) — there is no separate condition-evaluation language to build;
  suppression reuses the pipeline's existing per-criterion evaluation.
- **Where this runs in the pipeline**: conditional suppression is resolved
  **before** Stage 1/2 evaluate the suppressed criteria for a given
  candidate — for each candidate, the engine first evaluates any criterion
  that has dependents, and if it's satisfied, treats the criteria it
  suppresses as `IGNORE` *for that candidate specifically*, not globally
  for the applicant. This matters: a property without a pool still has its
  bedroom/area/price criteria evaluated normally, exactly as the worked
  example implies (the suppression only kicks in *when the condition
  holds*).
- **A suppressed criterion is explained as suppressed, not silently
  dropped.** `MatchExplanation`'s "ignored criteria" section (Stage 4)
  distinguishes a criterion the applicant explicitly marked `IGNORE` from
  one that was conditionally suppressed for this specific candidate — the
  user should be able to see *why* bedroom count didn't factor into this
  particular match ("ignored because this property has a pool"), which a
  bare `IGNORE` label would not communicate.
- **Deliberately bounded scope for this pass**: suppression is a simple
  "criterion → set of criteria it suppresses" relationship, evaluated once
  the suppressing criterion is known true/false for a candidate — not a
  general boolean-expression or rules engine (no AND/OR/NOT trees across
  arbitrary combinations of criteria). This keeps the feature
  implementable and testable without building more machinery than the
  actual product requirement calls for; if richer conditional logic is
  needed later, that's a deliberate future extension, not an oversight
  here.
- **This is what makes an eventual optional NL-assist layer (below) safe to
  add later without weakening determinism**: the sentence in the example
  above would, if that layer is ever built, be *proposed* as exactly the
  four structured criteria shown, for the user to review and confirm —
  the matching engine itself never sees or interprets the sentence; it only
  ever sees confirmed, structured `RequirementCriterion` rows, conditional
  or not.

## Optional natural-language input (explicitly bounded)

- **[CONFIRMED, Phase 0 Decision 3]** If ever built, natural-language input
  is architecturally a **pre-processing step that runs entirely before Stage
  1** — it proposes structured criteria (values + priorities) for user
  review/confirmation, and only the confirmed, structured result ever enters
  the pipeline above. The four-stage pipeline itself has no knowledge of
  whether its input came from manual entry or a confirmed NL-assisted
  proposal — architecturally invisible to the engine, by design, so the
  engine's determinism and AI-independence are structural, not just a policy
  promise.

## Performance considerations

- Stage 1's SQL-pushable filtering is the primary large-dataset performance
  lever (per `/docs/local-data/local-data-architecture.md`).
- Stages 2-3 operate only on the already-filtered candidate set, which should
  be small relative to the full dataset in typical use (most properties fail
  at least one MUST_HAVE criterion for most applicants) — but this is an
  assumption to validate empirically once real data volumes exist, not a
  guarantee.
- The engine's core logic (Stages 2-4 especially) should be plain,
  platform-agnostic TypeScript with no direct dependency on the UI or on
  ADR-001's eventual platform choice — testable in complete isolation, which
  directly supports the "extensive edge-case tests" requirement (PRODUCT.md's
  Testing section, MATCH-03/MATCH-05 in Phase 2).

## Risks

- The biggest unresolved risk is the scoring formula itself (Stage 3) —
  deliberately deferred, but it's also the piece most likely to need
  real-world tuning/iteration once agents start using the product, so it
  should be designed with configurability in mind (e.g. weights as data, not
  hardcoded constants) even though the specific values aren't fixed here.
- Approximate-value tolerance and range-edge scoring ("degree of match"
  tapering) are exactly the kind of detail that's easy to under-specify and
  hard to change later once users have built expectations around it —
  flagged for careful attention when Phase 4/the scoring formula is
  finalized.

## Scoring-weight decision status (new in Phase 4)

Per the explicit instruction not to finalize arbitrary weights without
documented rationale: **no specific weight values are set by this
document, and none are silently assumed elsewhere in this document set.**
What Phase 4 *does* fix is the constraint set any eventual weight values
must satisfy, so implementation isn't free to pick numbers that violate
the priority model's meaning:

1. MUST_HAVE contributes zero score weight (already a Stage 1 gate, not a
   Stage 3 input) — not a number to tune, a structural fact.
2. IGNORE contributes zero score weight — same.
3. IMPORTANT's weight must be strictly greater than PREFERRED's weight,
   for every candidate and every applicant, with no configuration path
   that could invert this — the priority model's ordering is a product
   guarantee, not a default that a bad configuration could quietly break.
4. Partial/approximate matches must contribute a fractional score between
   0 and that criterion's full weight, never negative and never exceeding
   the full weight of an exact match on the same criterion.

**[PRODUCT OWNER DECISION REQUIRED, or DEFERRED TO IMPLEMENTATION-TIME
DATA-DRIVEN TUNING]**: the actual numeric weights (e.g. "IMPORTANT = 3x
PREFERRED" vs. some other ratio), the approximate-value tolerance bands,
and the score normalization/presentation scale (0-100? a star rating?) are
not decided here, consistent with the Phase 3 analysis this document
carries forward. This is intentionally *not* silently defaulted to a
plausible-looking number in this pass — doing so would create the
appearance of a finalized formula where none has actually been reviewed.
Recommended path: define these weights alongside the Phase 4 schema
implementation, informed by a small internal review (the project owner
and whoever implements the matching engine) rather than fixed
speculatively in a documentation pass with no real data to validate
against.

## Unresolved questions carried to `/docs/architecture/unresolved-decisions.md`

- Exact scoring formula and weight values (IMPORTANT vs. PREFERRED, partial-
  match tapering) — see "Scoring-weight decision status" above for the
  constraints any eventual values must satisfy.
- Approximate-value tolerance definition.
- Score normalization/presentation scale.
- Whether/how a natural-language input layer is eventually built (optional,
  out of core-engine scope regardless).
