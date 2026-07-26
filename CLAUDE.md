## Agent skills

### Explicit skill invocation

When the user types a fully-qualified skill command (e.g. `/mattpocock-skills:implement` or `/plugin:skill-name`), invoke it via the Skill tool using that exact name — even if it doesn't appear in the current session's ambient "available skills" listing. That listing is a truncated subset of installed skills and varies by session; a user typing the exact name is giving explicit instruction, not asking the agent to guess. Only refuse if the named skill genuinely doesn't exist in any installed plugin.

### Issue tracker

Issues are tracked as GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary — needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Coding standards

### README currency

`README.md` is the project's front door (what it is, current status, setup steps) — kept separate from `CONTEXT.md` (domain language) and `docs/adr/` (decisions). It describes a snapshot of *current* state, not a changelog or a running history of work done — nothing about it is append-only.

Any change that alters setup/dev commands, adds or completes a major feature, or shifts overall project status must update `README.md` to match by rewriting the relevant section from scratch as a short, scannable list (e.g. one bullet per subsystem). Freely cut, reword, reorder, or replace existing bullets — don't preserve old phrasing or tack a new clause onto an existing sentence just to avoid touching prior text. A bullet describing work that's since been superseded, merged into a bigger feature, or made obsolete should be rewritten or removed, not kept alongside its replacement.

Keep the README to its front-door purpose only: what the project is, its current status, and how to set it up / run it. Rules-level detail belongs in `CONTEXT.md`, not the README — if a bullet starts explaining *how a rule works* rather than *that a feature exists*, move that detail to `CONTEXT.md` and link to it instead.

Code review should flag a stale, run-on/bloated, changelog-shaped, or out-of-scope README the same way it flags any other undocumented standards violation.
