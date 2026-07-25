## Agent skills

### Issue tracker

Issues are tracked as GitHub Issues via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary — needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Coding standards

### README currency

`README.md` is the project's front door (what it is, current status, setup steps) — kept separate from `CONTEXT.md` (domain language) and `docs/adr/` (decisions). Any change that alters setup/dev commands, adds or completes a major feature, or shifts overall project status must update `README.md` to match. Code review should flag a stale README the same way it flags any other undocumented standards violation.
