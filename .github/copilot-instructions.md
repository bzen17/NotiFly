## Review Philosophy

- Only comment when you have HIGH CONFIDENCE (>80%) that an issue exists
- Be concise: one sentence per comment when possible
- Focus on actionable feedback, not observations
- When reviewing text, only comment on clarity issues if the text is genuinely confusing or could lead to errors.

## Priority Areas (Review These)

### Security & Safety

- Unsafe code blocks without justification
- Command injection risks (shell commands, user input)
- Path traversal vulnerabilities
- Credential exposure or hardcoded secrets
- Missing input validation on external data
- Improper error handling that could leak sensitive info

### Correctness Issues

- Logic errors that could cause panics or incorrect behavior
- Race conditions in async code
- Resource leaks (files, connections, memory)
- Off-by-one errors or boundary conditions
- Incorrect error propagation (using `unwrap()` inappropriately)
- Optional types that don’t need to be optional
- Booleans that should default to false but are set as optional
- Error context that doesn’t add useful information
- Overly defensive code with unnecessary checks
- Unnecessary comments that restate obvious code behavior

### Architecture & Patterns

- Code that violates existing patterns in the codebase
- Missing error handling (should use `anyhow::Result`)
- Async/await misuse or blocking operations in async contexts
- Improper trait implementations

## Project-Specific Context

- This is a Rust project using cargo workspaces
- Core crates: `goose`, `goose-cli`, `goose-server`, `goose-mcp`
- Error handling: Use `anyhow::Result`, not `unwrap()` in production
- Async runtime: tokio
- See HOWTOAI.md for AI-assisted code standards
- MCP protocol implementations require extra scrutiny

## CI Pipeline Context

**Important**: You review PRs immediately, before CI completes. Do not flag issues that CI will catch.

### What Our CI Checks (`.github/workflows/ci.yml`)

**Rust checks:**

- cargo fmt --check
- cargo test --jobs 2
- ./scripts/clippy-lint.sh
- just check-openapi-schema

**Desktop app checks:**

- npm ci
- npm run lint:check
- npm run test:run

**Setup steps CI performs:**

- Installs system dependencies
- Activates hermit environment
- Caches Cargo and npm deps
- Runs npm ci before scripts

**Key insight**: Commands like `npx` check local node_modules first. Don't flag these as broken unless CI wouldn't handle it.

## Skip These (Low Value)

Do not comment on:

- Style/formatting (rustfmt, prettier)
- Clippy warnings
- Test failures
- Missing dependencies (npm ci covers this)
- Minor naming suggestions
- Suggestions to add comments
- Refactoring unless addressing a real bug
- Multiple issues in one comment
- Logging suggestions unless security-related
- Pedantic text accuracy unless it affects meaning

## Response Format

1. State the problem (1 sentence)
2. Why it matters (1 sentence, if needed)
3. Suggested fix (snippet or specific action)

Example:
This could panic if the vector is empty. Consider using `.get(0)` or adding a length check.

## When to Stay Silent

If you’re uncertain whether something is an issue, don’t comment.

---

Use these repository instructions to guide Copilot-based review agents and automations.
