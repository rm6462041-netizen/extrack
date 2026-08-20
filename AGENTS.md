- **Mandatory Pre-Edit Rule Verification & Re-Read**: BEFORE performing ANY file modification tool call (`replace_file_content`, `write_to_file`, `multi_replace_file_content`), the agent MUST re-read `AGENTS.md` and explicitly verify compliance with every behavioral rule. NEVER bypass or skip this step.
- **Strict Instruction Scope & Zero Extra Edits**: STRICTLY PROHIBITED to make any edit, modification, refactoring, or fallback addition beyond the user's explicit instruction and alignment scope ("ek bhi edit nahi karega beyond this instructions").
- **Zero Assumptions**: Never make any assumptions under any circumstances. If any requirement, schema, API contract, design decision, or user intent is ambiguous or unspecified, ask the user for explicit clarification before taking action ("apne man se kuch nahi karega").
- **No Property Permutations or Guessed Chained Fallbacks**: STRICTLY PROHIBITED to write chained property fallbacks or field permutations (e.g. `trade.trade_id || trade.tradeId || trade.id || trade['trade-id'] || trade['Trade Id']`). You MUST inspect the codebase, DB schema, or API payload to find the single, authoritative canonical property key. If the schema is uncertain, ask the user or inspect the source; never guess or write speculative fallback property chains.
- **No Hardcoding or Ad-Hoc Fallbacks**: Never hardcode values, ad-hoc properties, or introduce silent fallback values unless it is strictly the absolute only technical option. Even in such rare cases, consult the user and get explicit confirmation before implementing it.
- **Identify & State Problem Before Solution**: Never guess or attempt solutions blindly. Always inspect full logs/code, identify the exact root cause, explain the problem clearly to the user, and get alignment before writing any code fix.
- **Mandatory Impact Analysis & Research**: Before adding, modifying, or deleting any code, thoroughly research the codebase (callers, dependencies, API contracts, components) to ensure no other code or feature will be broken or affected.
- **Mandatory Empirical Verification**: Never declare success or mark a task complete without running build/tests and verifying runtime health (e.g. via DevTools/Chrome skill). Editing a file does not equal completing the task.
- **Ask Before Doing Anything Extra**: Always ask questions and get explicit user approval before doing anything extra, refactoring adjacent code, or taking actions outside the immediate instruction scope.
- **Strict Micro-Task Step Execution**: Execute instructions strictly step-by-step in small micro-tasks without jumping ahead, skipping steps, or assuming completion without empirical verification.
- **Parallel Execution for Large Tasks**: Whenever handling a large, complex, or multi-component task, break down the work into discrete sub-tasks and spawn parallel subagents (`invoke_subagent`) to execute them concurrently to maximize speed and efficiency.

# Workspace UI conventions

- Reuse the project's shared UI components without waiting for an explicit reminder.
- Use the shared DropdownSelect component from `src/components/Common/base/dropdown/dropdown.tsx` for dropdowns; do not add a native `<select>` when the shared component fits.
- Use the existing shared calendar/date-range components for date selection; do not add native date pickers or a second calendar implementation when the shared component fits.
- Use the shared `--checkbox-accent` theme token for checkbox checked states; all standard checkboxes use the same blue accent in light and dark modes.
- Format every user-facing calendar date as `DD/MM/YYYY`; never rely on browser locale or display month-first dates. When time is shown, use `DD/MM/YYYY HH:mm`.
- Always verify UI components, layout rendering, and runtime health by using the Chrome skill / DevTools to check that the app is running properly and has no console or runtime errors after every change before declaring a task complete.
- Never hardcode ad-hoc fallbacks, custom properties, or make UI/calculation assumptions independently ("apne man se kuch nahi karega"). Always consult the user and get explicit confirmation for design decisions or fallbacks.

# Broker trade mapping

- Before marking any broker sync complete, audit the full provider parser -> shared field mapping -> `trading.trades` insert/upsert -> API read path.
- Map every canonical field the provider supplies, including IDs, symbol, side, quantity, prices, timestamps, P&L and its currency, charges and their currencies, `percent_change`, `stop_loss`, and `take_profit`.
- Never invent unsupported broker values. Keep them null, preserve later user-entered values during upserts, and document the provider limitation in that connector's README.
- Add a focused mapping test for every new broker connector or mapping change.

# Test cleanup

- Prefer existing test files and targeted checks.
- If Codex creates a test file for verification, delete that test file immediately after the test finishes; never leave temporary test files in the worktree.

# Frontend information disclosure

- Follow `FRONTEND_INFORMATION_DISCLOSURE_RULES.md` for every user-facing string and run `npm run check:disclosure` after frontend copy changes.

# Security review

- For every security-sensitive change, use `.agents/skills/entrack-security-review/SKILL.md` and follow `docs/security/ENTRACK_SECURITY_PLAYBOOK.md`.
- Review every changed file before completion. Fix all Critical and High findings within scope; never expose secrets or real user data in review output.
