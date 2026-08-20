---
name: entrack-security-review
description: Review Entrack code changes for security regressions and enforce project security policy. Use for every change involving frontend copy, authentication, authorization, broker connections, credentials, OAuth, API routes, database queries, user files, imports, object storage, live feeds, logs, errors, financial data, or dependency/configuration changes; also use when asked for a security audit or before completing security-sensitive work.
---

# Entrack Security Review

Apply this review to changed code, not as a speculative whole-repo refactor.

## Workflow

1. Read `../../../docs/security/ENTRACK_SECURITY_PLAYBOOK.md` completely for a broad audit. For a scoped change, read its mandatory rules plus only the relevant sections.
2. Inspect the full changed data flow: user input -> route -> authentication -> ownership check -> validation -> service -> database/storage/provider -> response -> frontend rendering.
3. Review every changed file and its callers for:
   - frontend implementation disclosure or raw errors;
   - missing authentication, authorization, or object ownership checks;
   - cross-user reads/writes and IDOR/BOLA;
   - credential, token, financial-data, or personal-data exposure;
   - unsafe input, SQL, HTML, redirects, uploads, archives, URLs, or provider responses;
   - missing rate/resource limits on sensitive or expensive operations;
   - insecure logging, caching, WebSocket subscriptions, deletion, and retention;
   - weakened security defaults, dependencies, CORS, cookies, or headers.
4. Classify findings:
   - **Critical:** active secret exposure, authentication bypass, arbitrary code/SQL execution, or broad cross-user financial-data access.
   - **High:** exploitable ownership bypass, credential leakage, stored XSS, unsafe upload/archive handling, or material authorization failure.
   - **Medium:** defense-in-depth gap with plausible impact, unsafe error detail, missing sensitive-flow rate limit, or incomplete validation.
   - **Low:** hardening or maintainability issue without a practical exploit path.
5. Fix all Critical and High findings within the requested scope before completion. Do not silently expand scope for Medium/Low findings; report them concisely.
6. Run the smallest relevant checks. Always run `npm run check:disclosure` after frontend-copy changes. Use the Chrome skill / DevTools after every change to verify that the app is running properly without console or runtime errors. Add or update a focused security test for non-trivial security logic.

## Non-negotiable rules

- Derive user identity only from the verified server-side session/token. Never trust a frontend `userId` or owner field.
- Query protected resources with authenticated ownership in the same database operation where possible.
- Deny by default. A valid object ID is not authorization.
- Never return or log broker secrets, passwords, session tokens, OAuth tokens, encryption material, signed URLs, or raw provider responses.
- Keep credentials encrypted at rest and scoped to the least provider permission required.
- Validate type, shape, size, range, allowlists, and business invariants at every trust boundary.
- Use parameterized queries. Never concatenate untrusted SQL identifiers or values.
- Never render raw backend/provider errors or internal architecture in user-facing copy.
- Do not weaken authorization, TLS, credential handling, validation, or logging protection to make a feature work.

## Completion report

Report only findings relevant to the change, fixes applied, and checks run. Never include real secrets, private URLs, database values, fingerprints, or user data in the report.
