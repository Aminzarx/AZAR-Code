# Matching Scoring Specification

Status: PROPOSED — a formal model of *how* scoring works, deliberately
without fixed production weight numbers. Builds on
`/docs/matching/matching-architecture.md`'s four-stage pipeline and
`ADR-006-matching-engine.md`; this document goes one level deeper into
Stage 2 and Stage 3, since "the pipeline has four stages" and "here is
exactly how a partial match is scored" are different levels of detail, and
the brief for this pass specifically asked for the latter without asking
for arbitrary final numbers.
Date: 2026-08-08

## Why weights are still not set here

Every prior document that touched scoring weights said the same thing for
the same reason, and this document doesn't change that: inventing numbers
like "IMPORTANT is worth 3 points and PREFERRED is worth 1" with no real
match data to validate them against would produce a formula that *looks*
finished but isn't actually grounded in anything. That's a worse outcome
than an honestly incomplete formula, because it invites treating an
untested guess as settled. What this document *does* do is make the
**model** — the structure the weights eventually plug into — completely
concrete, so that when real weights are chosen (by the project owner, or
empirically, per the recommendation in `matching-architecture.md`), there
is exactly one place they need to go and no ambiguity about what they
mean.

## Priority levels and their role in scoring

| Priority | Role in Stage 1 (hard filter) | Role in Stage 3 (scoring) |
|---|---|---|
| `MUST_HAVE` | A binary gate — fails it, and the candidate is excluded entirely, before scoring runs. | None. A `MUST_HAVE` criterion contributes zero score weight, because by the time Stage 3 runs, every remaining candidate has already satisfied every `MUST_HAVE` criterion — there's nothing left to differentiate on. |
| `IMPORTANT` | Not evaluated in Stage 1. | Contributes a score, using a weight that must be strictly greater than any `PREFERRED` criterion's weight (`matching-architecture.md`'s existing constraint), reflecting that the applicant marked it as materially more significant than a preference. |
| `PREFERRED` | Not evaluated in Stage 1. | Contributes a score, using a weight strictly less than `IMPORTANT`. A nice-to-have that should move the ranking without dominating it. |
| `IGNORE` | Not evaluated in Stage 1. | Not evaluated in Stage 3 either — genuinely skipped, not scored as zero. A criterion explicitly marked `IGNORE`, or conditionally suppressed for a given candidate (§"Conditional criteria" below), never appears in the scoring computation and never appears as "mismatched" in the explanation. |

## Hard constraints vs. soft constraints

- **Hard constraint** = any `MUST_HAVE` criterion. Binary: satisfied or
  not. A failed hard constraint excludes the candidate at Stage 1 —
  there is no partial credit and no way for a strong score elsewhere to
  compensate for a failed hard constraint.
- **Soft constraint** = any `IMPORTANT` or `PREFERRED` criterion. These
  admit partial satisfaction (§"Match types" below) and contribute a
  fractional score rather than a pass/fail gate.
- A `Restriction` (the exclusion mechanism from `conceptual-data-model.md`,
  distinct from a `MUST_HAVE` criterion per Phase 1 §8.1) behaves like a
  hard constraint in its effect — failing it excludes the candidate — but
  is modeled and evaluated separately from `MUST_HAVE` criteria, since a
  restriction expresses "this disqualifies a candidate" rather than "this
  is a value I'm requiring," which is a different authoring intent even
  though the scoring-engine effect (exclusion) is the same.

## Match types

Every soft-constraint criterion's evaluation produces a **match degree**
between 0.0 (no match at all) and 1.0 (perfect match), before that degree
is multiplied by the criterion's weight to get its score contribution.
The match type determines how the degree is computed:

| Match type | Match degree computation |
|---|---|
| **Exact match** | 1.0 if the candidate's value equals the requirement's target value exactly; 0.0 otherwise. Used for discrete fields with no meaningful "closeness" (e.g. property type: apartment vs. villa). |
| **Range match** | 1.0 if the candidate's value falls within the requirement's stated range (e.g. price between X and Y); 0.0 if it falls outside the range **and** outside any tapering band (see approximate match below, which range matching uses at its edges). |
| **Approximate match** | A tapering function around a target value or range edge: 1.0 at the target/inside the range, degrading smoothly toward 0.0 as the candidate's value moves further away, reaching 0.0 at a defined tolerance boundary. The tapering function's exact shape (linear, or a smoother curve) and the tolerance boundary's exact size are **[OPEN — pending Phase 4B weight-setting]**; what's fixed here is that the degree must be a continuous, monotonically non-increasing function of distance from the target, not a step function, so a candidate that's "close" always scores at least as well as one that's "further off" for the same criterion. |
| **Categorical match** | Like exact match, but for a value drawn from a defined category set rather than a free scalar (e.g. a neighborhood/location tier, or an amenity category) — 1.0 for an exact category match, and optionally a partial degree for "adjacent" categories if the category set has a defined adjacency/hierarchy (e.g. neighboring locations) — **[OPEN-ARCH]** whether adjacency-based partial credit is used for location specifically, or all categorical matches are treated as pure exact-match, is left to be decided alongside real weight-setting, since it depends on whether a location hierarchy/adjacency model is built at all. |
| **Amenity/boolean match** | 1.0 if the candidate has the amenity/flag the requirement specifies as present (or absent, for a "must not have" style boolean requirement); 0.0 otherwise. No partial credit — a boolean either matches or doesn't. |

## Handling missing, conflicting, and excluded values

- **Missing value** (the candidate's `PropertyAttributes` doesn't have a
  value for a field the requirement references — e.g. an optional field
  that was never filled in): treated as **match degree 0.0** for that
  criterion, not as an error and not as an automatic exclusion (unless the
  criterion is itself `MUST_HAVE`, in which case Stage 1's normal
  hard-constraint-failure behavior applies — a missing value cannot
  satisfy a `MUST_HAVE` requirement, so the candidate is excluded exactly
  as it would be for any other failed `MUST_HAVE`). This is explained to
  the user as "criterion not matched" with a distinguishable reason
  ("property doesn't specify this") rather than lumped in with an
  ordinary value-mismatch, so a user can tell the difference between "the
  property actively has the wrong value" and "the property just never
  recorded this field."
- **Conflicting value** (a `RequirementCriterion`'s own definition is
  internally inconsistent — e.g. a range criterion where the minimum
  exceeds the maximum): this is a **data-entry validation error**, caught
  and rejected at the point the criterion is created or edited, never a
  state the matching engine has to interpret at evaluation time. The
  matching engine's contract assumes every `RequirementCriterion` it reads
  is already internally valid — this keeps Stage 2/3's evaluation logic
  simple and pushes validation to the boundary where the data is entered,
  consistent with the general "validate at system boundaries" principle.
- **Excluded value** (the candidate's value falls inside a `Restriction`'s
  excluded set/range for that applicant): treated as a hard-constraint-style
  exclusion, per the `Restriction` mechanism above — the candidate is
  removed from the result set entirely, with the explanation naming which
  restriction it failed, distinct from a `MUST_HAVE` failure in its
  labeling even though both exclude the candidate the same way
  mechanically.

## Conditional criteria (cross-reference)

Full design in `/docs/matching/matching-architecture.md` §"Conditional /
free-text-derived requirements" and `/docs/database/conceptual-data-model.md`
§"Conditional criteria" — summarized for scoring purposes: a criterion
that suppresses others when satisfied removes those other criteria from
**both** Stage 1 (if any of the suppressed criteria happened to be
`MUST_HAVE`) and Stage 3's scoring computation, for that specific
candidate, exactly as if the applicant had marked them `IGNORE` for that
one match — but the explanation (§"Explanation generation" below) records
*why* they were ignored (conditional suppression, naming the triggering
criterion) rather than presenting them identically to a criterion the
applicant permanently marked `IGNORE`.

## Score normalization

- The raw score for a candidate is the sum of (match degree × weight)
  across every non-`MUST_HAVE`, non-`IGNORE`, non-suppressed criterion.
- This raw score is normalized against the **maximum possible score for
  that specific applicant's criterion set** (the sum of every relevant
  criterion's weight, achieved if every one of them matched perfectly) —
  not against a fixed global maximum. This matters: two applicants with
  different numbers of `IMPORTANT`/`PREFERRED` criteria should each see
  their own results on a comparable 0-100%-style scale, rather than an
  applicant with fewer criteria being structurally capped below one with
  more.
- **[OPEN — pending Phase 4B weight-setting]** The exact presentation
  scale (0-100, a star rating, a qualitative tier) is not fixed here —
  this document fixes *what the score represents* (percentage of the
  applicant's own achievable weighted score), not how it's displayed.

## Explanation generation

For every match result, Stage 4 assembles a structured explanation with
these categories, each traceable directly to a specific criterion and its
Stage 2/3 evaluation:

| Category | Contents |
|---|---|
| **Matched** | Criteria (any priority) that achieved a match degree at or above a "counts as matched" threshold — **[OPEN]** exact threshold, likely at or near 1.0 for exact/boolean types and some tolerance-appropriate value for approximate/range types, pending weight-setting. |
| **Partially matched** | Soft-constraint criteria with a match degree strictly between the "matched" threshold and 0 — distinct from "matched" so a user can see a criterion contributed *something* without overstating it as a full match. |
| **Mismatched** | Soft-constraint criteria with a match degree of 0 (excluding those that are 0 specifically because of a missing value, which get the distinct "not specified" label from §"Missing values" above). |
| **Ignored** | Criteria the applicant explicitly marked `IGNORE`. |
| **Conditionally suppressed** | Criteria ignored for this specific candidate because a triggering criterion (§"Conditional criteria") was satisfied — labeled with which triggering criterion caused the suppression. |
| **Critical requirements satisfied** | Every `MUST_HAVE` criterion, listed as satisfied (they must all be, or the candidate wouldn't be in the result set at all) — included so the explanation is complete and doesn't make the user wonder "wait, didn't they require a pool?" when the pool criterion doesn't otherwise appear because it's not part of Stage 3's scoring. |

This table is the concrete content contract Stage 4 must produce — every
row must be populated from data Stage 1-3 already computed, never
re-derived after the fact by re-running comparisons lazily, per
`matching-architecture.md`'s existing requirement that the explanation is
inseparable from the score, not reconstructed later.

## What remains open (explicitly, not silently defaulted)

- Exact weight values for `IMPORTANT` vs. `PREFERRED` (only their relative
  ordering is fixed).
- The approximate-match tapering function's shape and tolerance-boundary
  sizes, per field.
- Whether categorical/location matching supports adjacency-based partial
  credit.
- The "counts as matched" vs. "partially matched" threshold.
- The final score presentation scale.

**[PRODUCT OWNER DECISION REQUIRED, or data-driven tuning at
implementation time]** for all of the above — consistent with
`matching-architecture.md`'s existing recommendation to resolve these
alongside real schema/data, informed by a focused internal review rather
than fixed speculatively here.
