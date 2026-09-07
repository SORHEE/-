---
name: agent-reach
description: Guides installing and configuring Agent Reach, an open-source CLI (https://github.com/Panniantong/agent-reach) that gives AI agents unified internet access — reading and searching Twitter/X, Reddit, YouTube, GitHub, Bilibili, XiaoHongShu, and more through one tool instead of separate API keys. Use this skill whenever the user asks to install, set up, configure, or troubleshoot Agent Reach, or asks how to give an AI agent broad internet/social-media access without juggling per-platform API keys — even if they call it by a shortened name like "agent reach" or just paste its GitHub/raw docs URL.
---

# Agent Reach

Agent Reach is a selector, installer, health checker, and router that gives AI agents internet
access by installing and managing upstream tools (OpenCLI, twitter-cli, bili-cli, rdt-cli, yt-dlp,
mcporter, gh CLI, etc.) behind one coordinating CLI. It is not itself a scraper — it picks the
right upstream tool for each platform and falls back to an alternative if the primary one fails.

Source of truth for the install flow: https://raw.githubusercontent.com/Panniantong/agent-reach/main/docs/install.md
Re-fetch that URL if these steps look stale — the upstream project updates it as platforms change.

## Why this needs the user to run it, not Claude

Installing Agent Reach means pulling a zip from GitHub and running `pip`/`pipx install` against it,
then letting the tool manage credentials for social platforms. That crosses two of Claude's hard
boundaries: it doesn't execute installs from third-party code sources on the user's behalf, and it
doesn't handle account credentials. **Always hand the commands to the user to run themselves** —
present them as runnable shell blocks and walk through the output with them, but do not run
`pipx install`, `pip install`, or `agent-reach install --system` via a tool call yourself.

Do feel free to run harmless local diagnostics on the user's behalf if it helps (e.g. checking
`pipx --version`, `python3 --version`, or `agent-reach doctor` output *if they've already installed
it and ask you to check*).

## Prerequisites

- Python 3.x
- macOS + Homebrew Python: may need a virtualenv due to PEP 668 (externally-managed-environment)
- Windows: use the Python Launcher (`py -3`) if the Microsoft Store Python alias is in the way

## Install flow

### Step 1 — Install the CLI

Recommended (pipx, isolated):
```bash
pipx install https://github.com/Panniantong/agent-reach/archive/main.zip
agent-reach install --env=auto
```

If they want it to touch system-level config (only after they explicitly say yes — this is a
bigger blast radius, confirm in chat before suggesting they run it):
```bash
agent-reach install --env=auto --system
```

Alternative — plain venv instead of pipx:
```bash
python3 -m venv ~/.agent-reach-venv
source ~/.agent-reach-venv/bin/activate
pip install https://github.com/Panniantong/agent-reach/archive/main.zip
agent-reach install --env=auto --system
```

### Step 2 — Pick optional channels

Ask which platforms they actually want (Twitter/X, Reddit, YouTube, GitHub, Bilibili, XiaoHongShu,
etc.) rather than installing everything by default — then:
```bash
agent-reach install --env=auto --system --channels=<channel-names>
```

### Step 3 — Diagnose and configure

```bash
agent-reach doctor
```
Walks through credential setup for whichever channels need auth (cookie export or login, per
platform). Optional: `agent-reach watch` sets up daily monitoring.

## Files it creates/modifies

- `~/.agent-reach/` — config and tokens
- `~/.agent-reach/tools/` — the upstream tool repos it manages
- `/tmp/` — scratch files
- `~/.agent-reach-venv/` — only if the venv install path was used

## Boundaries the tool itself claims to respect

No `sudo` without explicit approval, no system-file changes outside `~/.agent-reach/`, no workspace
pollution, no disabling of security features. Worth restating these to the user as what "good"
looks like if something in `agent-reach doctor` output looks off.
