# K2 — Catalog Item and Media CCR execution report

## 1. Task executed

Drafted the proposed Core catalog/media contract change request under `CODEX-20260921-K2-CATALOG-CCR-001`. The CCR remains **DRAFT** and makes no architecture decision on its four open questions.

## 2. Sources read

- `290eb35423e0658ff760b734ef04b8f82ec0b0a3:AI_HANDOFF/CLAUDE_REVIEWS/20260921_OWNER_APPROVAL_KD_DECISIONS_AND_K2.md` (K-D1–K-D14, K-N1, K2 scope).
- `f02436f9ac0c48e6df42cf879b5d187ab7d31efc:mlino2/MLINO_CATALOG_MEDIA_DESIGN.md` (K1 design).
- `origin/main`: `implementation/prisma/schema.prisma`, Core foundation and published-content migrations, Core services/permission registry, public-export builder/canonical/signing/distribution files, existing CCR examples, and V2 public-export mapping cited in the CCR.
- `C:\Users\galexy\.codex\attachments\98c51da1-e660-4f8e-8afd-fead59231cee\Pasted text.txt` (the complete K2 instruction).

## 3. Files changed

| Path | Change |
| --- | --- |
| `implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CATALOG_ITEM_AND_MEDIA.md` | New DRAFT CCR, commit `24b3491`; C1–C9, including proposed Prisma diff, SQL constraints, target-four rewrite, snapshot, artifact, migration/rollback, rollout, tests and open questions. |
| `AI_HANDOFF/CODEX_REPORTS/20260921_CODEX_K2_CATALOG_CCR_REPORT.md` | New report. |
| `mlino2/HANDOFF/HANDOFF_STATE.md` | Append-only handoff entry. |

## 4. Files not changed

No schema, migration, product code, V2 app, image, existing CCR, ADR, configuration or existing report was edited. `origin/main` and the K1 design branch were not modified.

## 5. Preconditions and validation

GW2-P on the pinned owner record:

| Check | Output |
| --- | --- |
| `git cat-file -t 290eb35423e0658ff760b734ef04b8f82ec0b0a3` | `commit` |
| `git merge-base --is-ancestor 290eb35423e0658ff760b734ef04b8f82ec0b0a3 origin/main` | exit `0` |
| SHA-256 of raw `git show 290eb35423e0658ff760b734ef04b8f82ec0b0a3:AI_HANDOFF/CLAUDE_REVIEWS/20260921_OWNER_APPROVAL_KD_DECISIONS_AND_K2.md` bytes | `84b6ecdb3ec0575cd9f8435aa6756d3c52d0873bd983146f76bc8d556ef55e8c` — matched |

Documentation validation: 24 balanced code-fence lines; C1–C9 present; `git diff --cached --check` passed before the CCR commit. K-W3 searches found registry `includes`, bootstrap iteration and grant validation; no length, indexed-order, sort or test-order dependency on `CORE_PERMISSION_KEYS` in the searched implementation tree. No code test, Prisma command, database, Docker or network operation was run.

## 6. Results and hash

The CCR is a proposal, not an implemented change. SHA-256 of the **raw Git blob** from `git show 24b3491:implementation/remediation/CONTRACT_CHANGE_REQUESTS/CONTRACT_CHANGE_REQUEST_CATALOG_ITEM_AND_MEDIA.md`: `5918ab1ae3f8f431e565b8a4344e466e4769ae5292a28d98ae97abe80eb8c649` (44,968 bytes). Hashing used Node `execFileSync('git', ['show', ...])` and `crypto.createHash('sha256')` to avoid PowerShell text transcoding.

## 7. Commit hash

CCR content: `24b3491`. The report and appended Handoff are committed locally after this report is written; no push is authorized.

## 8. Remaining risks and unverified items

The proposed Prisma model, manual SQL, trigger behavior, deferred media-position uniqueness, revision bump provenance, schema drift, composite FK behavior and artifact binding have **not** been executed or validated against PostgreSQL/Prisma. The CCR explicitly makes those G3/K3 validation gates. No claim of executable SQL correctness is made in K2. The cross-repository K-W3 search proves only absence in the checked `origin/main` implementation tree at the pinned base, not in future code.

## 9. Open questions

K-Q1: distinct Catalog signature domain separator; K-Q2: placeholder schema for v1; K-Q3: grouping label representation; K-Q4: exposed OfferVersion links. Each has options and one recommendation in C9. None was decided by Codex.

## 10. Recommended next step

Architecture Guardian reviews this DRAFT CCR against the owner decisions and the cited source; the owner resolves K-Q1–K-Q4 and approves the CCR before any K3 implementation instruction. Stop after local documentation commit.

من کدکس هستم
