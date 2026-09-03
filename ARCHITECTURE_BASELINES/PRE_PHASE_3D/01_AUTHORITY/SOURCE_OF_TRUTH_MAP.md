# Source of Truth Map — DRAFT GUIDE

Status: GUIDE, not architecture.

## Governing V1 architecture (repository classification)
- `architecture/Kernel_Architecture_v1.2_FROZEN.md` — highest architectural authority.
- `architecture/MLINO_Capability_Map_v1_FROZEN_FINAL.md`
- `capabilities/01-...` through `11-...` — capability specifications.
- `architecture/Interaction_Contracts_v1.0_FROZEN.md`
- `architecture/MLINO_Migration_Plan_v1.0_FROZEN.md`
- `architecture/architecture00_SYSTEM_OVERVIEW.md` — active shared mental model, no independent authority.
- `governance/ADR-*` — formal decisions within their scope.

## Product authority
Repository history states the `product/` folder is the Product Bible (D-4). However the current conversation contains later Product Vision calibrations. Those later calibrations are PRODUCT VISION until formally reconciled into the repository; they do not override Frozen Architecture.

## UX / AI / Foundation
These layers provide product/experience/AI context according to their own status, but may not amend Frozen Architecture by implication.

## Historical architecture
`architecture/_historical/` is non-authoritative for V1 architecture.

## V2
`MLINO_v2_architecture/` is separate. V2 concepts must not be used to fill V1 gaps.

## Conflict handling
Architecture: Frozen V1 governing baseline wins.
Product: identify whether the live Product Bible or newer Product Vision calibration is intended to be authoritative; do not silently merge them.
Unknown: OPEN/GAP.
