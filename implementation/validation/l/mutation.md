# Guardian mutation plan

Run each mutation separately on a disposable PostgreSQL database at `localhost:5499`, then restore the implementation before the next mutation.

1. Remove the `VERIFIED` and expiry checks from `BusinessProfileService.activate`. The tests `L1 profile activate rejects a PENDING identity claim`, `L1 profile activate rejects a SUSPENDED identity claim`, and `L1 profile activate rejects an expired VERIFIED claim` must fail.
2. Permit `BusinessProfileService.activate` when the profile is `ARCHIVED`. The test `L1 profile ACTIVE and ARCHIVED states cannot be activated again` must fail.
3. Remove `requireMembershipPermission(..., 'capability.manage')` from `CapabilityService.activate`. The test `L2 capability activation enforces permission and organization scope` must fail.

No mutation is applied to the committed product tree.
