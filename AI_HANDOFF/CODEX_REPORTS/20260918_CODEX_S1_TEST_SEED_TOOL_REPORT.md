# CODEX S1 Test Seed Tool Execution Report

**Instruction:** `CODEX-20260918-S1-TEST-SEED-TOOL-001`  
**Workstream:** `HANDOFF-20260918-TEST-SEED`  
**Status:** `BLOCKED_BEFORE_INTEGRATION_ACCEPTANCE`  
**Implementation commit:** `ddabd32`

## 1. Task executed

یک ابزار افزودنی برای خواندن، اعتبارسنجی، نگاشت، seed و withdraw دادهٔ آزمایشی ونک ساخته شد. دادهٔ واقعی فقط به‌صورت read-only اعتبارسنجی شد؛ هیچ رکورد واقعی، نام کسب‌وکار، شماره، نشانی یا کلیدی وارد مخزن نشد.

پیاده‌سازی تا مرز قابل انجام بدون نقض دستور پیش رفت. پذیرش یکپارچه کامل نشد، چون دو مانع مستقل وجود دارد:

1. روی `localhost:5499` PostgreSQL موقت در دسترس نیست و Docker و شبکه در این دستور ممنوع‌اند.
2. Core رسمی پروفایل را با `DRAFT` و قابلیت را با `PLANNED` می‌سازد، ولی هیچ عملیات service برای تبدیل آن‌ها به `ACTIVE` ندارد. Export فقط ردیف‌های `ACTIVE` را نمایش می‌دهد. نوشتن مستقیم در جدول برای دور زدن این فاصله صریحاً ممنوع است.

## 2. Source documents used

- Owner approval: `da51093e8a7ac9d25fb2f7812ee566082238cb78:AI_HANDOFF/CLAUDE_REVIEWS/20260918_OWNER_APPROVAL_TEST_SEED_TOOL.md`
- Pinned SHA-256: `e35551800294f57f2687894b387f3fbea910a7b934c59e0e9e4cfaec467032a2` — verified by GW2-P.
- Core service implementations and current Prisma schema on the branch base.
- Real input path, read-only: `C:\mlino code\_TEST_DATA\vanak_businesses.json`.

## 3. Files changed

- `implementation/tools/test-seed/{types,parse,map,seed,withdraw,cli}.ts`
- `implementation/test/tools/test-seed/{parse-map,verifier}.spec.ts`
- `implementation/validation/s1/*`
- This report
- Append-only handoff entry

The LF SHA-256 values for implementation commit `ddabd32` are in `implementation/validation/s1/LF-MANIFEST.txt` and were computed from Git blob bytes.

## 4. Files not changed

- No existing `implementation/core/**` file
- No existing `implementation/public-export/**` file
- No Prisma schema or migration
- No package or lock file
- No `.env`, credential, token, real key, Docker, V2, `origin/main`, or `_PUSH_STAGING` content
- The real 15-business input file was not modified or copied

## 5. Core call sequence implemented

All mutations use official services in this order:

1. `BootstrapService.execute` — `implementation/core/bootstrap-service.ts:19`
2. `IdentityClaimService.submit` — `implementation/core/identity-claim-service.ts:20`
3. `IdentityVerificationService.start` — `implementation/core/identity-verification-service.ts:28`
4. `IdentityVerificationService.markUnderReview` — `implementation/core/identity-verification-service.ts:58`
5. `IdentityVerificationService.decide(VERIFIED)` — `implementation/core/identity-verification-service.ts:74`
6. `BusinessProfileService.create` — `implementation/core/business-profile-service.ts:27`
7. `BusinessProfileService.linkIdentityClaim` — `implementation/core/business-profile-service.ts:59`
8. `PublicationService.publish(BUSINESS_PROFILE)` — `implementation/core/publication-service.ts:20`
9. For each service: `CapabilityService.create`, `confirm`, then `PublicationService.publish(CAPABILITY)` — `implementation/core/capability-service.ts:27,74`
10. Cleanup uses only `PublicationService.withdraw` — `implementation/core/publication-service.ts:25`

The only direct Prisma calls in the tool are read-only discovery for idempotency and withdrawal target discovery. There are no direct writes and no raw SQL.

## 6. Tests executed

| Requirement | Test/evidence | Result |
|---|---|---|
| Strict parser and fixed rejection codes | `S1 strict Vanak test-data parser` | PASS |
| Mobile-shaped text rejected anywhere | `mobile-shaped text anywhere in a nested record is rejected without echoing it` | PASS |
| ISO Persian weekday mapping | `Persian weekdays map Monday=1 through Sunday=7, and closed days are omitted` | PASS |
| `validBusinessHours` compatibility | Same mapping test | PASS |
| Marker and null omission | `mapped profile carries marker and omits null contact/link values` | PASS |
| Verifier confirmation gate | `refuses a missing explicit confirmation` | PASS |
| Verifier localhost gate | `refuses a non-local database host` | PASS |
| Real file parser, values suppressed | `REAL_INPUT_VALID count=15` | PASS |
| 3-business DB seed/export/idempotency | Disposable PostgreSQL required | NOT RUN — blocked |
| Withdraw/no-delete integration | Disposable PostgreSQL required | NOT RUN — blocked |
| Three mutation proofs | Requires complete acceptance path | NOT RUN — blocked |

## 7. Test results

- TypeScript build: PASS in three runs.
- Focused unit tests: 2 suites, 17 tests, all PASS in three consecutive runs.
- Real input parse: 15 records valid; only the count was emitted.
- Integration database: NOT RUN; port 5499 had no listener and Docker/network were forbidden.
- Leak check: 0 actual mobile literals, 0 real business-name hits, 0 `PRIVATE KEY` hits. Three PostgreSQL URL literals are synthetic unit-test inputs; no environment or `.env` value was read.

## 8. Commit hash

- Implementation and evidence: `ddabd32`
- Final report/handoff commit: recorded by the subsequent local documentation commit.
- Push: not attempted, as required.

## 9. Remaining risks and open questions

The schema defaults are `BusinessProfile.lifecycleStatus=DRAFT` (`schema.prisma:478`) and `Capability.capabilityStatus=PLANNED` (`schema.prisma:503`). The export gate requires both to be `ACTIVE` (`public-export/builder.ts:180,194`). The named official services expose no activation transition. Therefore the required export of three seeded records cannot be achieved under S1-D3 without one of these Guardian/owner decisions:

- authorize and implement official lifecycle transition operations in Core; or
- change the S1 acceptance contract so the seed tool may stop before public export eligibility.

The first option is recommended because it preserves the service boundary and gives production flows the lifecycle operation they also need.

## 10. Recommended next step

Guardian review should classify the missing lifecycle operations and issue a narrowly scoped instruction. After that change, rerun S1 integration and mutation validation on a disposable PostgreSQL at `localhost:5499`. Do not run this tool against the owner database until the separate backup-and-local-execution approval is granted.

من کدکس هستم
