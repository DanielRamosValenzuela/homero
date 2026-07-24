# Feature tasks: <feature-name>

## Tasks

- [ ] Confirm all blocking open questions are resolved.
- [ ] Complete `features/__FEATURE_ID__/feature.json` and pass `homero feature check` before implementation.
- [ ] Record backend contract source, draft contract, or no-contract exception.
- [ ] Register realistic anonymized development mocks for required success and error states.
- [ ] Create or update the feature structure.
- [ ] Implement UI from the approved Figma source using Tomaco and project conventions.
- [ ] Implement business rules and validation.
- [ ] Add or update focused tests.
- [ ] Use Playwright CLI to run required user scenarios and save screenshots plus snapshots under `features/__FEATURE_ID__/evidence/`.
- [ ] Run `node scripts/homero/homero.mjs verify --target . --id __FEATURE_ID__` and record the receipt.
- [ ] Compare implementation against the spec and plan.

## Verification evidence

- lint:
- typecheck:
- test:
- design review: