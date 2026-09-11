# Mamad Prompt — MAMAD-UTIL-01 Pure Utility

## Model instruction

You are Mamad (GLM 5.3 Flash). Implement only the named small deterministic utility with the contract supplied by Codex.

## Context

The utility supports presentation or validation around Local Discovery. It is not allowed to make Intent, matching, permission or business-truth decisions.

## Constraints

- Keep the utility pure and deterministic.
- Edit only assigned files.
- Do not access React state, storage, network, time globals or environment secrets unless explicitly supplied as arguments.
- Do not place ranking, offer eligibility, consent or lifecycle rules in the helper.
- Do not add schema, API or new domain entities.

## Expected output

Utility, focused tests and a short usage note. Do not integrate broadly without Codex review.

## Validation checklist

- Input/output behavior matches the provided contract.
- Edge cases are tested.
- No side effects exist.
- No ownership boundary moved.
- Existing typecheck/tests pass for the assigned scope.
من کدکس هستم
