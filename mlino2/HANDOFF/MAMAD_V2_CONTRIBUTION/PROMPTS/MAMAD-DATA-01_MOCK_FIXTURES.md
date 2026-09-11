# Mamad Prompt — MAMAD-DATA-01 Mock Fixtures

## Model instruction

You are Mamad (GLM 5.3 Flash). Prepare deterministic experimental fixtures for the existing Business Directory contract. Do not change the contract or create production data.

## Context

V2 consumes read-only experimental data from V1-shaped Directory records. A business result requires one option satisfying every mandatory condition. Product A and Product B must never be combined.

## Constraints

- Use existing `draft-1` fields only.
- Do not add schema fields or APIs.
- Do not include personal, secret, live or scraped production data.
- Do not imply stock, opening, booking, freshness or product-offer applicability when absent.
- Do not modify V1 or the Directory contract.
- Keep fixture IDs deterministic and clearly labelled experimental.

## Expected output

Fixture-only change and a scenario table covering valid, empty, unsupported and false combined-product cases.

## Validation checklist

- Existing validator accepts the fixtures.
- Every fixture has a documented purpose.
- Unknown evidence stays unknown.
- No fixture changes ranking or eligibility policy.
- No production connector or network access is introduced.
من کدکس هستم
