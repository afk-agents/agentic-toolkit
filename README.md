<div align="center">

# 🧪 claude-experiments

**A workshop for Claude Code extensions.**

Skills, slash commands, and an installer — the things I've built to make an agent better at the work I actually do.

[![Claude Code](https://img.shields.io/badge/Claude_Code-D97757?style=flat-square&logo=anthropic&logoColor=white)](https://docs.anthropic.com/en/docs/claude-code)
[![Agent Skills](https://img.shields.io/badge/Agent_Skills-8_included-6B4FBB?style=flat-square)](#skills)
[![Slash Commands](https://img.shields.io/badge/Slash_Commands-7_included-4A5568?style=flat-square)](#slash-commands)
[![Python](https://img.shields.io/badge/uv_scripts-PEP_723-3776AB?style=flat-square&logo=python&logoColor=white)](https://peps.python.org/pep-0723/)
[![Bash](https://img.shields.io/badge/Bash-4EAA25?style=flat-square&logo=gnubash&logoColor=white)](#the-installer)

</div>

---

## What this is

Claude Code lets you extend the agent three ways: **skills** (capabilities it loads when relevant), **commands** (slash-invoked prompts), and **agents** (subagent definitions). This repo is where I try things out in that space.

Some of it is infrastructure automation — provision a Convex project, spin up a Vercel deployment, wire a whole Next.js + Convex + Vercel app together from one command. Some of it is workflow: git worktrees for parallel branches, forking a terminal session into a new window carrying its context with it. And one of them is a skill for writing skills.

Everything here is meant to be lifted out and dropped into your own `.claude/` directory. There's [an installer](#the-installer) for exactly that.

---

## Skills

<table>
<tr><th align="left">Skill</th><th align="left">What it does</th></tr>

<tr><td><code>convex-manager</code></td><td>Drives the <a href="https://convex.dev">Convex</a> Management API — list, create, and delete projects; list deployments; mint deploy keys; create production deployments. Five standalone Python scripts, no SDK.</td></tr>

<tr><td><code>vercel-manager</code></td><td>Same idea against the Vercel REST API — list and create projects, trigger deployments, manage domains.</td></tr>

<tr><td><code>creating-nextjs-convex-vercel-apps</code></td><td>The two above, composed. Nine steps from nothing to a deployed fullstack app: scaffold Next.js, push to GitHub, create the Convex dev deployment, mint keys, write <code>.env.local</code>, push the schema, create production, create the Vercel project, deploy. Ships with Convex schema/auth/http assets.</td></tr>

<tr><td><code>convex-rules</code></td><td>The Convex conventions an agent gets wrong by default — function syntax, validators, indexes, query vs. mutation vs. action. Loaded whenever backend code is in play.</td></tr>

<tr><td><code>worktrees</code></td><td>Git worktree management for parallel development — create, list, remove, prune, all under <code>worktrees/</code>. Isolated branches without stashing.</td></tr>

<tr><td><code>fork-terminal</code></td><td>Forks the current session into a new terminal window, optionally carrying a summary of the conversation so far as the new agent's opening prompt. Works with Claude Code, Codex CLI, Gemini CLI, or a raw command. Cookbook per tool.</td></tr>

<tr><td><code>uv-script</code></td><td>Self-contained Python scripts using <a href="https://peps.python.org/pep-0723/">PEP 723</a> inline dependency metadata — no venv, no requirements file, <code>uv run</code> and it works. This is the pattern the manager skills above are built on.</td></tr>

<tr><td><code>create-skill</code></td><td>A skill for authoring skills. Structure, frontmatter, description-writing (the part that determines whether the skill ever triggers), an independence checklist, and a rule that scripts are Python.</td></tr>

</table>

---

## Slash commands

| Command | |
|---|---|
| `/prime` | Loads context for a fresh session — analyzes structure, reads the docs and README, reports back before touching anything |
| `/question` | Answers questions about the project with no code changes. Read-only by construction: `allowed-tools` is `git ls-files` and `Read` |
| `/tools` | Lists every built-in non-MCP tool available, with TypeScript-style signatures |
| `/worktree-create` `/worktree-list` `/worktree-remove` `/worktree-prune` | Worktree lifecycle, matching the skill |

The read-only commands are a small idea that pays off: scoping `allowed-tools` down to exactly what a prompt needs means "just answer my question" can't turn into an edit.

---

## The installer

`install-claude-extension.sh` copies skills, commands, and agents into a `.claude` directory — from a local path or straight from a URL.

```bash
# a command, globally
./install-claude-extension.sh command ./my-command.md

# several skills into the current repo
./install-claude-extension.sh -l skill ./skill-a/ ./skill-b/

# straight from GitHub
./install-claude-extension.sh command https://raw.githubusercontent.com/user/repo/main/commands/example.md
```

| Flag | |
|---|---|
| `-g, --global` | Install to `~/.claude` (default) |
| `-l, --local` | Install to `./.claude` in the current repo |
| `-h, --help` · `-v, --version` | |

Accepts `skill`/`skills`, `command`/`commands`, `agent`/`agents`. Handles both directory-style and single-file skills, creates target directories as needed, warns before overwriting, and needs `curl` or `wget` for URLs. Full docs in [README-install-script.md](README-install-script.md).

---

## Layout

```
.claude/
├── skills/          # convex-manager, vercel-manager, worktrees,
│   └── <name>/      #   fork-terminal, uv-script, create-skill,
│       ├── SKILL.md #   convex-rules, creating-nextjs-convex-vercel-apps
│       ├── scripts/
│       └── assets/
├── commands/        # prime, question, tools, worktree-*
├── agents/
└── mcp-servers/

install-claude-extension.sh
README-install-script.md
```

---

## Using any of this

Grab a skill directory and drop it into your own `.claude/skills/`, or use the installer:

```bash
git clone https://github.com/namick/claude-experiments.git
cd claude-experiments
./install-claude-extension.sh -g skill .claude/skills/uv-script/
```

The manager skills need credentials — `CONVEX_TOKEN` and `VERCEL_TOKEN` in a `.env` at your project root. See [.env.example](.env.example).

The Python scripts are PEP 723 self-contained; [uv](https://docs.astral.sh/uv/) runs them with no setup:

```bash
uv run .claude/skills/convex-manager/scripts/list_projects.py
```

---

<div align="center">
<sub>Experiments. Expect sharp edges — that's the point of a workshop.</sub>
</div>
