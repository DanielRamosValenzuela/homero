# Backend contracts and mocks

Frontend work should be able to progress before the backend is ready, but it
must not invent data shapes silently. Use this document to record the contract
source and mock strategy for backend-dependent features.

## Contract mode

- Mode: contract-first | contract-draft | no-contract-exception
- Format: openapi | json-schema | examples | postman | curl | manual | none
- Source: local path, URL, ticket, or pasted examples
- Owner:

## Mock strategy

- Strategy: fixtures | msw | service-layer-stub | custom
- Mock location:
- States to simulate:
  - success
  - loading
  - empty
  - validation error
  - business error
  - network/server error

## Sensitive data policy

- Use anonymized examples only.
- Do not commit secrets, tokens, personal identifiers, or production payloads.
- Replace real customer data with realistic fake values.

## Open contract questions

-

## Frontend independence rule

If final backend contracts are unavailable, create a draft contract or fixture
set and mark it clearly as temporary. The feature plan must record what needs to
be confirmed with backend before production integration.
