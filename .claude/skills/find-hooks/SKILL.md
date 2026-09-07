---
name: find-hooks
description: Search community repositories for Claude Code hooks, slash commands, subagents, plugins, or MCP servers that match the user's need, then install the chosen one into settings.json. Trigger ONLY when the user explicitly asks to find/recommend/search hooks (or commands/agents/plugins/MCPs) — e.g. "훅 추천해줘", "find a hook for X", "커밋 전에 린트 도는 훅 찾아줘". Do NOT trigger on general automation requests.
---

# find-hooks

Community-sourced recommender for Claude Code extensions. Always fetches fresh — no local cache.

## When to run

ONLY when the user explicitly asks to **find / search / recommend** a hook, slash command, subagent, plugin, or MCP server. If the user just describes an automation need without asking for a recommendation, do not trigger — suggest writing one directly instead.

## Step 1 — Classify the request

Map the user's need to the right extension type before searching. Use this table:

| User intent | Right type |
|---|---|
| "X가 일어날 때마다 자동으로 Y" / 도구 호출 전후 자동 실행 / 차단 | **hook** |
| "/명령어로 자주 쓰는 프롬프트 호출" / 반복 작업 템플릿 | **slash command** |
| "특정 작업을 전담할 전문 에이전트" / 컨텍스트 격리가 필요한 작업 | **subagent** |
| "기능 묶음 설치" (커맨드+에이전트+훅 세트) | **plugin** |
| "외부 도구/서비스 연동" (Slack, DB, 브라우저 등) | **MCP server** |

If ambiguous, ask the user one clarifying question before searching.

## Step 2 — Search (always fresh, no cache)

1. Run **WebSearch** first with the user's keywords + the chosen type. Example queries:
   - `Claude Code hook prettier format on save github`
   - `Claude Code subagent code review github`
2. From results, pick the **1–3 most relevant** repository pages (prefer the curated lists below if they appear).
3. Run **WebFetch** on those pages to extract concrete examples / JSON snippets / install instructions.

### Preferred sources to look for in results
- `github.com/hesreallyhim/awesome-claude-code` — biggest curated list
- `github.com/disler/claude-code-hooks-mastery` — hook examples with full JSON
- `github.com/ccplugins/awesome-claude-code-plugins` — plugins/commands/agents/MCPs
- `github.com/ChrisWiles/claude-code-showcase` — real settings.json examples
- `github.com/rohitg00/awesome-claude-code-toolkit` — large toolkit

Do NOT fetch all of them. Use WebSearch to narrow first, then fetch only what's likely to contain the answer. Budget: ≤3 WebFetch calls per request.

## Step 3 — Present 2–4 candidates

For each candidate show:
- **Name** + 1-line purpose
- **Source URL**
- **Type** (hook / command / agent / plugin / MCP)
- For hooks: the **event** (`PreToolUse`, `PostToolUse`, etc.) and **matcher**
- The **exact JSON / file content** to install
- Any **dependencies** (e.g. "requires `prettier` on PATH")

Then ask the user which one to install (or "none").

## Step 4 — Install

Ask the user to choose the install scope:

| Scope | Path | When |
|---|---|---|
| Global (user) | `~/.claude/settings.json` | applies to all projects |
| Project shared | `<repo>/.claude/settings.json` | committed, shared with team |
| Project local | `<repo>/.claude/settings.local.json` | personal, gitignored |

Then install based on type:

### Hooks → merge into settings.json
- Read existing file (create `{}` if missing).
- Merge under `hooks.<EventName>`. If a block with the same `matcher` exists, **append** to its `hooks` array instead of duplicating.
- Validate the resulting JSON parses.
- Show a diff of what changed.
- If the `update-config` skill is available, prefer delegating the merge to it.

### Slash commands → file under `commands/`
- Global: `~/.claude/commands/<name>.md`
- Project: `<repo>/.claude/commands/<name>.md`

### Subagents → file under `agents/`
- Global: `~/.claude/agents/<name>.md`
- Project: `<repo>/.claude/agents/<name>.md`
- Must have frontmatter with `name`, `description`, and (optionally) `tools`.

### Plugins → use Claude Code's plugin install flow
- Tell the user the plugin marketplace command or repo URL; do not hand-copy files.

### MCP servers → merge into `~/.claude.json` or project `.mcp.json`
- Add under `mcpServers.<name>` with `command`, `args`, `env`.
- Warn the user that MCP servers run external processes — they should review the source before installing.

## Step 5 — Verify

After install:
1. Re-read the modified file and confirm it parses.
2. Tell the user **how to test it** (e.g. for a `PostToolUse` hook on Edit: "make any edit and check that the command ran").
3. Note that hook/MCP changes take effect on the next Claude Code restart (or new session) — settings.json hot-reloads but MCP servers do not.

## Guardrails

- **Never install without explicit user approval of the specific candidate.**
- **Always show the exact command/script that will run** before installing — hooks execute arbitrary shell, MCP servers spawn processes. Treat third-party code as untrusted.
- If a candidate runs `curl | sh`, downloads binaries, or has no source visible, flag it and recommend against it.
- Do not invent hooks. If search yields nothing relevant, say so and offer to write one from scratch instead.
- Convert any relative info from fetched pages (stars, "recent", etc.) into absolute terms when reporting.
