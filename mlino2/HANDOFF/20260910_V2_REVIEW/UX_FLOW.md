# UX Flow Review

## 1. User entry

The user opens the V2 customer experience and can browse the existing map/directory and personal context. Stage 2 adds an explicit nearby-discovery command in the experience panel. The action is user initiated; there is no unsolicited notification.

## 2. Location and context

The flow uses the location point, radius, category, floor, and other visibility choices already held by the V2 experience. Location permission is not silently forced by the new command. The selector receives the visible records after caller-side filters have been applied.

## 3. Discover and view a business

The selector first requires at least one offer whose current time is between `valid_from` and `valid_until` inclusive. It then measures distance, rejects candidates outside the selected radius, and chooses the nearest remaining business with a stable business ID tie-break. The chosen result opens in the normal card/detail surface.

## 4. Business interaction

The user can inspect the business name, category, offer status, and available detail actions. The share action creates a short text containing the business identity, category, MLINO context, and test-data label. Native share is attempted when available; clipboard and manual text are fallbacks.

## 5. AR / visual experience

The AR overlay uses the same offer-status rule as the directory and detail views. An upcoming or expired offer is not presented as active. The stage does not claim camera-based business recognition or production-grade GPS/floor detection.

## 6. Empty states

- No active offer: explain that no currently valid offer is available.
- Outside radius: explain that the selected area has no qualifying result and expose the radius control where applicable.
- Filters remove all visible records: explain that the current filters are the cause and offer a way to adjust them.
- Share cancellation: remain in the page without copying unexpectedly.
- Clipboard/native share failure: show readable text for manual copying.

## 7. Edge cases

- `valid_from` in the future: `upcoming`, excluded from active discovery.
- `valid_until` in the past: `expired`, excluded.
- malformed or reversed intervals: `invalid`, fail closed.
- equal distances: stable `business_id` ordering avoids random output.
- radius at the maximum configured range: no meaningless “increase radius” control.
- hidden records: excluded before selection; the selector does not bypass caller visibility rules.
- no browser share capability: manual fallback remains available.

## Validation boundary

The tested build covered mobile and desktop layouts, the nearby command, empty states, offer validity, AR validity logic, and share modes. Real camera, GPS, map tile availability, and blocked-storage behavior remain field or environment-dependent checks.
