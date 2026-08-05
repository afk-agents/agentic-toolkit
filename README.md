<div align="center">

# Agentic Toolkit

**Skills, commands, and an installer for AI coding agents.**

The extensions I've built to make an agent better at the work I actually do — provisioning backends, managing parallel sessions, and authoring skills themselves.

[![Agent Skills](https://img.shields.io/badge/Agent_Skills-11_included-6B4FBB?style=flat-square)](#skills)
[![Slash Commands](https://img.shields.io/badge/Slash_Commands-7_included-4A5568?style=flat-square)](#slash-commands)
[![Spec](https://img.shields.io/badge/spec-agentskills.io-0A7EA4?style=flat-square)](https://agentskills.io/specification.md)
[![Python](https://img.shields.io/badge/uv_scripts-PEP_723-3776AB?style=flat-square&logo=python&logoColor=white)](https://peps.python.org/pep-0723/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

</div>

---

## What this is

A skill is packaged instructions plus optional scripts that extend what an agent can do. Everything here follows the open [Agent Skills](https://agentskills.io/) format, so it works with any agent that reads the spec rather than being tied to one product.

Each skill is self-contained. You can install one without taking the rest.

```bash
bunx skills add afk-agents/agentic-toolkit@<skill-name>
```

---

## Skills

**Authoring**

| Skill | What it does |
|---|---|
| `agent-skill-maker` | Creates and updates skills. Fetches the live [specification](https://agentskills.io/specification.md), Claude Code docs, and best-practices guide on every invocation rather than relying on baked-in knowledge, then validates the result against the spec — naming, description length, file references. No cached snapshot to go stale. |

**Backend provisioning and deployment**

| Skill | What it does |
|---|---|
| `convex-manager` | Drives the [Convex](https://convex.dev) Management API — list, create, and delete projects; list deployments; mint deploy keys; create production deployments. Six standalone Python scripts, no SDK. |
| `vercel-manager` | The same idea against the Vercel REST API — list projects, create projects, trigger deployments. |
| `creating-nextjs-convex-vercel-apps` | The two above, composed. Nine steps from nothing to a deployed fullstack app: scaffold Next.js, push to GitHub, create the Convex dev deployment, mint keys, write `.env.local`, push the schema, create production, create the Vercel project, deploy. Ships with Convex schema/auth/http assets. |
| `convex-rules` | The Convex conventions an agent gets wrong by default — function syntax, validators, indexes, query vs. mutation vs. action. Loads whenever backend code is in play. |

**Session and workflow**

| Skill | What it does |
|---|---|
| `managing-worktrees` | Git worktree management for parallel development — create, list, remove, prune, all under `worktrees/`. Isolated branches without stashing. |
| `fork-terminal` | Forks the current session into a new terminal window, optionally carrying a summary of the conversation so far as the new agent's opening prompt. Works with Claude Code, Codex CLI, Gemini CLI, or a raw command. Cookbook per tool. |
| `uv-script` | Self-contained Python scripts using [PEP 723](https://peps.python.org/pep-0723/) inline dependency metadata — no venv, no requirements file, `uv run` and it works. This is the pattern the manager skills are built on. |

**Writing analysis**

| Skill | What it does |
|---|---|
| `slop-score` | Scans text for statistical patterns common in AI-generated writing — overused slop words and trigrams, "not just X, but Y" contrast structures, lexical diversity — and returns JSON metrics calibrated against human writing. *(Port — see [license](#license).)* |
| `slop-analyzer` | Consumes those metrics and interprets them: names the specific words and phrases driving the score, proposes alternatives, and orders suggestions by impact. *(Port — see [license](#license).)* |

**Frontend reference**

| Skill | What it does |
|---|---|
| `tailwind-css` | Tailwind CSS v4 — CSS-first `@theme` configuration, responsive breakpoints, state variants, container queries, and the v3-to-v4 migration path including renamed and removed utilities. Eleven reference files loaded on demand. |

> `slop-score` and `slop-analyzer` wrap a TypeScript port of
> [Sam Paech's slop-score](https://github.com/sam-paech/slop-score). The analysis method and
> datasets are his; the port, CLI, tests, and skill packaging are the contribution here.
> Some bundled files are Apache-2.0 and CC-BY-SA-4.0 rather than MIT —
> see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

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

`bunx skills add` handles skills. `install-claude-extension.sh` handles the rest — it copies skills, commands, *and* agents into a `.claude` directory, from a local path or straight from a URL.

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

Accepts `skill`/`skills`, `command`/`commands`, `agent`/`agents`. Handles both directory-style and single-file extensions, creates target directories as needed, warns before overwriting, and needs `curl` or `wget` for URLs. Full docs in [README-install-script.md](README-install-script.md).

---

## Skill structure

Each skill follows the [Agent Skills specification](https://agentskills.io/specification.md):

- `SKILL.md` — Required. YAML frontmatter plus markdown instructions for the agent.
- `scripts/` — Optional. Executable code the agent can run.
- `references/` — Optional. Supporting documentation loaded on demand.
- `assets/` — Optional. Static resources such as templates, images, or data files.

Skills vendor their dependencies rather than sharing them. `slop-score` and `slop-analyzer` each carry a full copy of the analysis engine instead of pointing at a common parent. That duplication is deliberate: a skill has to resolve as a standalone install target, so `bunx skills add ...@slop-analyzer` must work without also pulling `slop-score`.

---

## Using any of this

The manager skills need credentials — `CONVEX_TOKEN` and `VERCEL_TOKEN` in a `.env` at your project root. See [.env.example](.env.example).

The Python scripts are PEP 723 self-contained; [uv](https://docs.astral.sh/uv/) runs them with no setup:

```bash
uv run skills/convex-manager/scripts/list_projects.py
```

---

## License

This repository's own work is [MIT](LICENSE).

It also bundles third-party components that are **not** all MIT. `slop-score` is a
TypeScript port of [Sam Paech's slop-score](https://github.com/sam-paech/slop-score)
(MIT), and it carries the upstream's split licensing for the wordfreq parts:

| Component | License |
|---|---|
| This repo's own work | MIT |
| slop-score core + datasets | MIT © Sam Paech |
| `src/lib/wordfreq.ts` | Apache-2.0 |
| `data/large_en.msgpack.gz` | **CC-BY-SA-4.0** (share-alike) |

The data file is share-alike: redistributing it carries attribution *and* licensing
obligations that MIT does not. If you plan to reuse or repackage these skills, read
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) first — it has the full breakdown,
the required citations, and the statement of changes.
