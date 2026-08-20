# Frontend Information Disclosure Rules

## Critical rule

User-facing copy may describe only what the user can do, the result they receive, the current status, and a safe next action. It must never reveal how Entrack stores, fetches, imports, processes, caches, archives, synchronizes, or retrieves data internally.

Never expose infrastructure or implementation details such as Cloudflare, R2, S3, buckets, object storage, database tables or schemas, internal routes or endpoints, servers, workers, queues, jobs, caches, file paths, storage layout, fallback logic, secrets, stack traces, SQL errors, or raw provider responses.

This applies to headings, labels, descriptions, tooltips, toasts, dialogs, empty/loading/error states, help text, accessibility labels, and any backend error rendered by the frontend.

## Safe copy

- Explain the user action and result, not the implementation.
- Never render raw backend error fields. Use `src/utils/safeErrors.js` or a fixed user-safe message.
- Keep technical details only in protected server logs and developer documentation.
- Legitimate product terms required for an action, such as “Binance API key,” are allowed. Internal API routes and processing details are not.

Bad: “Completed years reuse the same R2 archive.”

Good: “Completed years include the full available history.”

## Exceptions

Public legal/privacy documents may accurately disclose required data-processing categories. Protected internal admin screens require explicit approval. Do not add broad exclusions.

## Required check

Run `npm run check:disclosure` after changing frontend copy. The production build runs this check automatically. Before adding text, ask: “Does this reveal how our internal system works?” If yes, rewrite it from the user’s perspective.
