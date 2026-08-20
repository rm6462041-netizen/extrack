# Entrack Security Playbook

This is the mandatory secure-development policy for Entrack. It applies to frontend, backend, broker connectors, financial data, imports, storage, live feeds, AI features, infrastructure configuration, tests, and developer tooling.

It complements `FRONTEND_INFORMATION_DISCLOSURE_RULES.md`. When rules conflict, use the stricter safe behavior and do not weaken an existing control without explicit approval and evidence.

## 1. Mandatory principles

- Deny access by default and grant the minimum required permission.
- Treat every browser, uploaded file, broker response, webhook, URL, identifier, and database value crossing a boundary as untrusted.
- Authenticate first, authorize every protected object and action, then validate the requested operation.
- Keep security decisions on the server. Frontend hiding or disabled controls are not authorization.
- Minimize collected, returned, logged, cached, and retained sensitive data.
- Prefer established platform security controls and maintained libraries over custom cryptography or token formats.
- Fail closed without destroying recoverable user data.
- Never expose internal implementation details or raw errors to users.
- Security applies to one-line changes and background/live paths, not only HTTP controllers.

## 2. Data classification

### Restricted

Passwords, broker API secret keys, OAuth access/refresh tokens, session tokens, encryption keys, reset tokens/OTPs, signed object URLs, private connection strings, and raw credential payloads.

- Never send these back after initial submission.
- Never log, include in analytics, place in URLs, store in browser persistence, or expose to AI prompts.
- Encrypt required credentials at rest with managed, rotatable keys; limit plaintext lifetime in memory.

### Sensitive

Trades, balances, positions, account fingerprints, broker account IDs, imports, attachments, personal data, emails, phone numbers, strategies, notes, and audit records.

- Return only to the authenticated owner or explicitly authorized role.
- Avoid identifiers and values in logs; use request/correlation IDs.
- Apply documented retention and verified deletion.

### Public/internal

Public broker catalog and marketing content may be public. Infrastructure names, schemas, object paths, job behavior, fallbacks, limits, private endpoints, and operational diagnostics remain internal even when they contain no secret.

## 3. Frontend disclosure and safe errors

- Follow `FRONTEND_INFORMATION_DISCLOSURE_RULES.md`.
- User copy may state the action, result, status, and safe next step—not storage, caching, archiving, database, queue, worker, polling, fallback, provider-response, or sync internals.
- Never render `error.message`, response bodies, SQL/provider errors, stack traces, internal codes, paths, hostnames, or ports directly.
- Map errors through `src/utils/safeErrors.js` or fixed context-safe messages. Log technical detail only server-side after redaction.
- Do not expose sensitive data through DOM attributes, source maps, console logs, accessibility labels, notifications, query strings, or client telemetry.
- Run `npm run check:disclosure` after frontend-copy changes.

## 4. Authentication and sessions

- Use modern password hashing with a maintained password-hashing implementation and cost settings reviewed periodically.
- Enforce password-reset and email-verification tokens that are random, single-use, short-lived, purpose-bound, and invalidated after success.
- Do not reveal whether an email/account exists during login, signup, or recovery unless product policy explicitly accepts enumeration risk.
- Rate-limit login, signup, OTP issue/verification, password reset, token refresh, and connection attempts by account and network signals.
- Rotate session identifiers after login, privilege change, password reset, and account recovery.
- Store browser sessions in `HttpOnly`, `Secure`, appropriately scoped `SameSite` cookies where supported. Never put session or reset tokens in URLs except unavoidable one-time verification links; prevent referrer leakage.
- Validate token issuer, audience, signature, expiry, purpose, and revocation/session state. Never decode a token and treat it as verified.
- Logout must invalidate server-side session/refresh state; clearing frontend state alone is insufficient.
- Require recent authentication for destructive account actions or credential replacement when risk justifies it.

## 5. Authorization and user isolation

- Derive the acting user from authenticated middleware only. Ignore or reject frontend owner/user fields.
- Scope every trade, account, broker connection, credential, import, attachment, note, setting, sync state, balance, position, archive, and export by authenticated ownership.
- Prefer atomic ownership queries such as `WHERE id = $1 AND user_id = $2`; do not fetch by ID and authorize later when one scoped query works.
- Check ownership again for update/delete, background jobs, downloads, presigned access, WebSocket subscriptions, cache keys, and reconnect flows.
- Never authorize by account fingerprint alone. A fingerprint supports deduplication, not ownership.
- Prevent mass assignment: allowlist writable properties and keep owner, role, status, credential references, and internal metadata server-controlled.
- For bulk operations, verify every object or perform one user-scoped query. Partial unauthorized success is a failure.
- Add negative tests proving User A cannot read, modify, delete, sync, download, or subscribe to User B's resources.

## 6. Broker credentials and connections

- Request only read-only permissions required for history, balances, positions, and live updates. Do not require trading, transfer, withdrawal, or account-management permissions.
- Verify credentials server-side against the intended provider environment before marking a connection active.
- Bind stored credentials to user, connection, provider, and environment. Do not silently reuse credentials across users or environments.
- Encrypt credentials with authenticated encryption; store nonce/tag/key version as required; keep master keys outside the database and repository.
- Never return decrypted credentials or a recoverable secret to the frontend. “Configured” status is enough.
- Redact API keys and secrets from request logs, exceptions, monitoring breadcrumbs, provider-client debugging, and test fixtures.
- Credential replacement must verify ownership, revalidate access, rotate encrypted payload, and invalidate obsolete live sessions.
- Disconnect/delete must revoke or delete local credentials immediately, stop live streams, clear sensitive snapshots, and apply documented trade/archive retention.
- Account fingerprints must be one-way, environment-namespaced, collision-resistant, and never displayed. They cannot replace provider verification.
- Demo and real environments must stay isolated in identifiers, endpoints, trades, caches, files, and UI state.

## 7. OAuth and third-party integrations

- Use authorization code flow with `state`; use PKCE where supported.
- Bind OAuth state to user, connection intent, environment, redirect target, and short expiry; consume it once.
- Use exact allowlisted redirect URIs. Never redirect to an arbitrary request parameter.
- Encrypt refresh/access tokens at rest, request minimal scopes, rotate when supported, and handle revocation.
- Do not expose provider tokens or raw callback errors to the browser.
- Treat provider data and error payloads as untrusted. Validate expected types, sizes, identifiers, timestamps, and enumerations.
- Apply timeouts, bounded retries with backoff/jitter, response-size limits, and circuit-breaking where provider failure could exhaust resources.
- Never send credentials to a redirect host or URL not fixed by the connector.

## 8. APIs and request validation

- Authenticate protected routes before handler logic and authorize the exact resource/action.
- Validate request body, params, query, headers, pagination, dates, enums, UUIDs, monetary values, and arrays with explicit limits.
- Reject unexpected security-sensitive fields rather than silently accepting them.
- Limit body size, upload size, batch size, history range, page size, concurrency, and execution time.
- Use safe HTTP methods and status codes; do not mutate state through GET.
- Protect cookie-authenticated mutations against CSRF using SameSite plus origin/CSRF validation appropriate to deployment.
- Use a strict CORS allowlist; never combine wildcard origins with credentials.
- Rate-limit authentication, broker connect/sync, imports, AI requests, exports, uploads, email/OTP, and other expensive/sensitive flows.
- Make retryable mutations idempotent with stable server-controlled uniqueness where duplicates cause harm.
- Do not expose sequential IDs or UUIDs as a substitute for authorization.

## 9. Database and financial integrity

- Use parameterized queries for all values. Allowlist any dynamic table, column, sort, or direction identifier.
- Scope queries by user ownership and preserve constraints that enforce tenant boundaries and external-trade uniqueness.
- Use transactions for connection replacement, credential rotation, deletion, imports, and multi-table financial updates.
- Validate decimal precision, currencies, signs, timestamps, quantities, and provider IDs. Avoid binary floating-point for authoritative money calculations where exact decimals are required.
- Preserve user-entered fields during broker upserts unless an explicit authoritative rule says otherwise.
- Do not invent unsupported broker values; keep them null.
- Prevent duplicate replay with provider-scoped stable unique IDs and environment/account namespaces.
- Apply least-privilege database roles, encrypted transport, protected backups, migration review, and restoration testing.
- Do not include secrets or unrestricted production data in fixtures, dumps, screenshots, or local debug output.

## 10. Imports, CSV, ZIP, and attachments

- Enforce allowlisted file types, extensions, MIME/signature checks, size limits, row/column limits, and parse timeouts. Browser `accept` is not validation.
- Generate storage names; never trust paths or filenames. Block traversal, control characters, reserved names, and overwrite collisions.
- Parse files as data, never execute macros, formulas, scripts, or embedded content.
- Protect spreadsheet exports against formula injection by neutralizing cells beginning with formula-control characters when opened in spreadsheet software.
- For ZIP/archive input, limit compressed/uncompressed size, entry count, nesting, compression ratio, and extraction destination; reject traversal and symlinks.
- Stream large files with bounded memory and abort incomplete uploads.
- Validate every parsed field and bind imported records to the authenticated user's connection server-side.
- Treat images/attachments as untrusted; re-encode or scan when appropriate, serve with safe content types/disposition, and block active content.
- Remove temporary files on success/failure. Never leave credentials or user data in shared temp paths longer than necessary.

## 11. Private object storage

- Keep financial archives private; public buckets and permanent public URLs are prohibited.
- Build object keys server-side from owned opaque connection IDs and validated fixed segments. Do not accept arbitrary keys from clients.
- Store object metadata in a user-owned database record and verify ownership before every read, write, delete, or signed-access operation.
- Use least-privilege credentials scoped to the required bucket/actions; keep them server-side and rotate them.
- Use short-lived signed URLs only when direct access is required; bind method/content constraints where supported and never log the URL.
- Verify integrity, expected size/type, and successful durable storage before marking an import complete.
- Define retention for active, disconnected, and permanently deleted accounts. Permanent deletion must remove database records, credentials, archives, derivatives, and queued work as policy requires.
- Log storage actions by safe identifiers, never object contents, secrets, or signed query parameters.

## 12. Live feeds, WebSockets, and background work

- Authenticate the initial connection and authorize every subscription, account, and reconnect—not only the page that opened it.
- Never trust client-provided user/account IDs for channel selection.
- Partition connection state and cache keys by authenticated user, broker connection, provider environment, market, and symbol as applicable.
- Remove subscriptions, listen keys, timers, and sensitive memory on logout, disconnect, credential rotation, and socket close.
- Validate message type and size; rate-limit inbound actions and bound outbound queues/backpressure.
- Background jobs must carry immutable owner/resource identifiers and re-check current ownership/status before side effects.
- Make jobs idempotent, bounded, observable, and safe to retry. Never place secrets in queue payloads when a credential reference suffices.
- Avoid fallback to a different market/provider when correctness or account isolation would change; fail safely and report a generic status.

## 13. XSS, rendering, redirects, and browser security

- Rely on React escaping; do not use `dangerouslySetInnerHTML` without audited sanitization and a documented need.
- Sanitize rich text with an allowlist; strip scripts, event handlers, dangerous URLs, styles, SVG/MathML hazards, and embedded active content as applicable.
- Validate outbound URLs and protocols. Block `javascript:`, unsafe `data:` URLs, protocol-relative surprises, and open redirects.
- Use a restrictive Content Security Policy, frame protections, MIME sniffing protection, referrer policy, and permissions policy appropriate to the app.
- Do not store Restricted data in local/session storage, IndexedDB, client caches, service workers, or query strings.
- Clear user-scoped client caches on logout and account change without relying on obfuscation as security.

## 14. Logging, monitoring, and audit

- Use structured server logs with request/correlation ID, safe event name, outcome, and minimal identifiers.
- Never log passwords, secrets, API/OAuth/session/reset tokens, cookies, authorization headers, encrypted credential blobs, signed URLs, raw financial files, or full provider responses.
- Redact sensitive fields recursively before logging; do not rely on each caller remembering.
- Record security-relevant events: authentication failure, credential changes, connection/disconnection, authorization denial, sensitive deletion, rate-limit activation, and admin actions.
- Prevent log injection by structured encoding and control-character handling.
- Restrict log access, protect integrity, set retention, and alert on abnormal auth, ownership denial, sync, export, and deletion patterns.
- User-facing errors stay generic; protected logs contain the minimum diagnostic detail needed.

## 15. Secrets, configuration, dependencies, and CI

- Keep secrets in environment/secret management, never source, generated bundles, images, documentation examples, issue text, or test snapshots.
- Validate required configuration at startup without printing secret values.
- Separate development, test, and production credentials and data. Production secrets must not work in preview/test environments.
- Pin lockfiles, review new dependencies for maintenance and necessity, remove unused packages, and monitor vulnerabilities.
- Run secret scanning, dependency review, static analysis, tests, and disclosure checks in CI. Block Critical/High findings and committed secrets.
- Protect CI tokens with least privilege; do not expose secrets to untrusted pull-request code or artifact logs.
- Review production source maps and debug features; keep internal diagnostics inaccessible to normal users.
- Apply security updates promptly based on exploitability and exposure, with rollback and verification plans.

## 16. AI features

- Authorize every piece of user data before it enters model context or retrieval. Never rely on the model to enforce tenant boundaries.
- Minimize and redact credentials, personal data, internal infrastructure, and unrelated financial records from prompts and telemetry.
- Treat user notes, broker text, retrieved documents, and tool output as untrusted prompt-injection content.
- Allowlist tools and actions; require deterministic server-side authorization and validation for every model-initiated operation.
- Do not let model output directly execute SQL, code, URLs, trades, deletion, credential changes, or external messages.
- Make destructive or externally consequential actions explicit and confirmed.

## 17. Deletion, retention, and recovery

- Distinguish user soft-delete, disconnect, repair, and permanent account/data deletion.
- Soft-deleted broker trades remain hidden and recoverable without bypassing ownership.
- Permanent deletion removes or irreversibly anonymizes all scoped primary data, credentials, archives, attachments, derived caches, and pending work according to policy.
- Retention metadata must not make a disconnected account appear connected or restore data to a different owner.
- Backups require encryption, access control, tested restoration, and expiry consistent with published policy.
- Security controls must not make recovery impossible: preserve safe audit/recovery data only as legally and operationally justified.

## 18. Security testing requirements

For security-sensitive changes, add the smallest focused test that proves the control:

- unauthenticated request denied;
- User A cannot access User B's object;
- invalid/unexpected input rejected;
- raw error/secret absent from response and logs;
- demo/real and broker/account namespaces do not collide;
- duplicate/replayed import is idempotent;
- malicious filename, CSV formula, ZIP traversal/bomb, rich-text XSS, or unsafe redirect rejected when relevant;
- credential rotation/disconnect stops obsolete access;
- deletion and retention behavior matches policy.

Tests must use synthetic secrets and data. Never print live values on failure.

## 19. Change-completion gate

Before completing any coding task, verify changed files:

- [ ] No internal implementation detail was added to user-facing copy.
- [ ] No raw backend/provider error reaches the user.
- [ ] Authentication and object/action ownership are enforced server-side.
- [ ] No frontend user/owner identifier is trusted as authorization.
- [ ] Secrets and sensitive data are absent from responses, logs, URLs, caches, and source.
- [ ] Inputs, uploads, provider data, URLs, and resource use are bounded and validated.
- [ ] Database queries are parameterized and user-scoped.
- [ ] Broker environment/account data cannot collide or cross users.
- [ ] Live/background/storage paths repeat ownership checks.
- [ ] Critical and High findings are fixed; remaining findings are reported.
- [ ] Relevant security and disclosure checks pass.

## 20. Reference baseline

Use OWASP ASVS, OWASP Cheat Sheet Series, and OWASP API Security Top 10 as the external baseline. Adapt controls to Entrack's actual architecture; do not copy controls blindly or claim compliance without verification evidence.
