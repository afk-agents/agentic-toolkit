# Agentic Toolkit

A collection of skills for AI coding agents. Skills are packaged instructions and scripts that extend agent capabilities.

Skills follow the open [Agent Skills](https://agentskills.io/) format specification.

## Available Skills

### agent-skill-maker

Creates or updates agent skills following the official [Agent Skills specification](https://agentskills.io/specification.md) and best practices. Use it when you want to author a new skill, update an existing one, or scaffold a skill directory structure.

**Install:**

```
npx skills add afk-agents/agentic-toolkit@agent-skill-maker
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

### tailwind-css

Tailwind CSS v4 styling with utility-first classes, theme configuration, and modern CSS patterns. Use when writing or modifying CSS classes, configuring themes, implementing responsive designs, or migrating from v3.

**Install:**

```
npx skills add afk-agents/agentic-toolkit@tailwind-css
```

**What it does:**

- Provides quick reference for responsive breakpoints, state variants, and dark mode
- Explains v4 CSS-first configuration with `@theme` blocks
- Documents the v3 to v4 migration path including renamed and removed utilities
- Covers functions, directives, container queries, and advanced variants
- Includes comprehensive utility references for layout, typography, colors, and more
- Shows common patterns for centering, grids, cards, buttons, and forms

## Skill Structure

Each skill follows the [Agent Skills specification](https://agentskills.io/specification.md):

- `SKILL.md` - Required. YAML frontmatter plus markdown instructions for the agent.
- `scripts/` - Optional. Executable code the agent can run.
- `references/` - Optional. Supporting documentation loaded on demand.
- `assets/` - Optional. Static resources such as templates, images, or data files.

## License

MIT