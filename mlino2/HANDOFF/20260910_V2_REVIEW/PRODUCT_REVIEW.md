# Product Review

## User journey

### Before Stage 2

The user could enter the V2 customer experience, inspect a local map or directory, apply existing context such as category, floor, and radius, and open a business card. They had to browse manually. There was no explicit action to ask for the closest relevant active offer. Offer validity did not include the start boundary consistently, and there was no dependable share action.

### After Stage 2

The user can explicitly choose “Find a nearby offer.” The experience evaluates the already visible records, removes businesses without a currently active offer, applies the selected location and radius, and chooses the nearest candidate with a stable business ID tie-break. If nothing qualifies, the UI explains whether the result is empty because of filters, distance, or missing active offers and exposes the appropriate next control. The user can open the business detail and share a short text description using native share, clipboard fallback, or a manual copy path.

The same active/upcoming/expired decision is used by directory cards, details, and AR overlays, so the user does not see one offer called active in one surface and unavailable in another.

## Moment of Value

The key moment is when the user asks for a nearby offer and receives a specific, currently valid business that is within the chosen radius. The value is reinforced when the user can open the detail or share it without leaving the experience. An honest empty state is also part of the value: MLINO does not manufacture relevance when the available data cannot support it.

## Business value

A business benefits from being surfaced at the moment a nearby user expresses a matching need. The selection is based on proximity and valid offer timing, so presence in the result is tied to a concrete user request rather than an unsolicited interruption. Text sharing creates a lightweight referral path between users.

The stage does not prove visits, purchases, or revenue. Those outcomes require consented measurement, stronger data contracts, and independent validation in a later stage.

## Product impact

Stage 2 moves V2 toward the product vision of an intent-first real-world experience layer. It does not turn V2 into an advertising feed, and it does not use `liked`, `saved`, or `viewed` state to change ranking.
