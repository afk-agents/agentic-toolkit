# Agentic Toolkit

A collection of skills for AI coding agents. Skills are packaged instructions and scripts that extend agent capabilities.

Skills follow the open [Agent Skills](https://agentskills.io/) format specification.

## Available Skills

- [slop-score](#slop-score) — Returns metrics for AI writing patterns
- [slop-analyzer](#slop-analyzer) — Uses metrics to provide actionable revision suggestions
- [tailwind-css](#tailwind-css) — Tailwind CSS v4 utilities and patterns
- [agent-skill-maker](#agent-skill-maker) — Create and update agent skills

### slop-score

Analyzes text files for AI-generated writing patterns and returns JSON metrics. Use when checking drafts or essays for overused AI patterns like slop words, contrast structures, and suspicious trigrams.

**Install:**

```
bunx skills add afk-agents/agentic-toolkit@slop-score
```

**What it does:**

- Scans text for statistical patterns common in AI-generated writing
- Detects overused "slop words" and trigrams that LLMs favor
- Identifies unnatural contrast patterns like "not just X, but Y"
- Measures lexical diversity and vocabulary level
- Returns structured JSON output with detailed metrics
- Provides calibration scores benchmarked against human writing and various AI models

### slop-analyzer

Analyzes writing for AI-like patterns and provides actionable suggestions for making text sound more natural and human-written. Use after drafting creative writing, essays, or blog posts to get revision guidance.

**Install:**

```
bunx skills add afk-agents/agentic-toolkit@slop-analyzer
```

**What it does:**

- Runs slop-score analysis and interprets the results
- Identifies specific words and phrases that trigger AI detection
- Provides concrete revision suggestions with alternatives
- Prioritizes feedback by impact—leading with the most important changes
- Frames suggestions constructively without quality judgments
- Understands that good writing has personality and occasionally breaks rules

### tailwind-css

Tailwind CSS v4 styling with utility-first classes, theme configuration, and modern CSS patterns. Use when writing or modifying CSS classes, configuring themes, implementing responsive designs, or migrating from v3.

**Install:**

```
bunx skills add afk-agents/agentic-toolkit@tailwind-css
```

**What it does:**

- Provides quick reference for responsive breakpoints, state variants, and dark mode
- Explains v4 CSS-first configuration with `@theme` blocks
- Documents the v3 to v4 migration path including renamed and removed utilities
- Covers functions, directives, container queries, and advanced variants
- Includes comprehensive utility references for layout, typography, colors, and more
- Shows common patterns for centering, grids, cards, buttons, and forms

### agent-skill-maker

Creates or updates agent skills following the official [Agent Skills specification](https://agentskills.io/specification.md) and best practices. Use it when you want to author a new skill, update an existing one, or scaffold a skill directory structure.

**Install:**

```
bunx skills add afk-agents/agentic-toolkit@agent-skill-maker
```

**What it does:**

- Fetches the latest Agent Skills specification, Claude Code skills documentation, and best practices guide before writing anything
- Parses the user's request for a skill name and description
- Checks for an existing skill and preserves its structure when updating
- Designs frontmatter, content structure, and supporting files
- Writes valid SKILL.md with proper YAML frontmatter and markdown body
- Verifies the result against specification rules (naming, description length, line count, file references)

**Always up to date:**

The agent-skill-maker fetches live documentation from the web on every invocation rather than relying on baked-in knowledge. This means skills it produces will conform to the latest version of the specification and best practices, even after the format evolves. There is no cached snapshot to go stale -- the source of truth is always the published docs.

## Skill Structure

Each skill follows the [Agent Skills specification](https://agentskills.io/specification.md):

- `SKILL.md` - Required. YAML frontmatter plus markdown instructions for the agent.
- `scripts/` - Optional. Executable code the agent can run.
- `references/` - Optional. Supporting documentation loaded on demand.
- `assets/` - Optional. Static resources such as templates, images, or data files.

## License

MIT