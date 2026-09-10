# Architecture Review

## Components built

- `offers.ts`: one fail-closed status function for `active`, `upcoming`, `expired`, and `invalid` offers using both `valid_from` and `valid_until`.
- `pickSuggestion.ts`: a pure nearby selector over records that the caller has already made visible; it applies active-offer filtering, radius, distance, and stable ID tie-breaking.
- `shareBusiness.ts` and `ShareBusinessAction.tsx`: explicit text sharing through native Web Share, clipboard fallback, and readable manual fallback. User cancellation does not copy silently.
- `ExperiencePanel.tsx`: the user-triggered nearby command, result handling, and explicit empty states.
- `BusinessCard.tsx`, `App.tsx`, and `ArOverlayService.ts`: shared offer validity across directory, detail, and AR surfaces.
- Focused unit tests, a browser harness, and delivery documentation.

## Relationship with V1

There is no operational V1↔V2 connection in Stage 2. No V1 source, backend service, `AI_HANDOFF/` file, main branch, or frozen integration contract was changed. The V2 code remains a customer-side local experience and consumes its existing local directory shape.

## Dependencies

- Existing `V2BusinessDirectoryRecord` records and their `offers` fields.
- Existing location, radius, floor, category, hidden, saved, and viewed state in the V2 UI.
- Existing directory geo utilities for distance calculation.
- Browser Web Share and Clipboard capabilities when available; otherwise the manual path is used.
- Existing AR overlay and map surfaces for displaying the result.

## API and data contracts

Stage 2 uses the existing record shape and the existing `valid_from`/`valid_until` offer fields. It adds no network endpoint, persistence schema, authentication flow, backend write, or V1↔V2 gateway. The selector accepts visible records, a user point, a radius, and a timestamp; it returns a business ID or an explicit reason for no result.

## Intentionally kept separate

- Discovery selection is separate from the existing matching/ranking system.
- `liked`, `saved`, and `viewed` remain local experience state and do not influence ranking.
- V1 business operations and V2 customer discovery remain separate.
- Product inventory, reviews, social links, chat, analytics, and conversion attribution remain outside the current contracts.
- Deep linking and daily/random recommendation rotation remain future work.

## Architecture risk for review

The current data is local/mock data and the location/camera capabilities have not been field-validated. Any production integration must define ownership, freshness, unknown values, expiry, consent, and compatibility before connecting V1 data or adding measurement.
