# Claude Code Extension Installer

A command-line tool to easily install skills, commands, and agents into your Claude Code `.claude` directory.

## Features

- ✨ Install skills, commands, or agents
- 📦 Support for multiple extensions at once
- 🌍 Install globally (`~/.claude`) or locally (`./.claude`)
- 🌐 Download from URLs or install from local files/directories
- 🎨 Color-coded output for better readability
- ⚠️ Overwrites existing extensions with warning

## Installation

1. Copy the script to a location in your PATH:
   ```bash
   cp install-claude-extension.sh ~/bin/
   # or
   sudo cp install-claude-extension.sh /usr/local/bin/
   ```

2. Make it executable (if not already):
   ```bash
   chmod +x install-claude-extension.sh
   ```

## Usage

```bash
install-claude-extension.sh [OPTIONS] TYPE SOURCES...
```

### Arguments

- `TYPE` - Extension type: `skill`, `command`, or `agent` (also accepts plurals)
- `SOURCES` - One or more paths or URLs to install

### Options

- `-g, --global` - Install to `~/.claude` (default)
- `-l, --local` - Install to `./.claude` in current repo
- `-h, --help` - Show help message
- `-v, --version` - Show version information

## Examples

### Install a single command globally

```bash
install-claude-extension.sh command ./my-command.md
```

### Install multiple commands to local repo

```bash
install-claude-extension.sh -l command ./cmd1.md ./cmd2.md ./cmd3.md
```

### Install a skill directory globally

```bash
install-claude-extension.sh skill ./my-skill/
```

### Install from a URL

```bash
install-claude-extension.sh command https://raw.githubusercontent.com/user/repo/main/commands/example.md
```

### Install multiple skills locally

```bash
install-claude-extension.sh -l skill ./skill-a/ ./skill-b/ ./skill-c/
```

### Install agents

```bash
install-claude-extension.sh -l agent ./my-agent.md
```

## Extension Types

### Commands

- **Format**: Single `.md` file
- **Location**: `.claude/commands/`
- **Example**: `question.md`, `worktree-create.md`

### Skills

- **Format**: Directory with `SKILL.md` and supporting files, or single `.md` file
- **Location**: `.claude/skills/`
- **Structure** (for directory-based):
  ```
  my-skill/
  ├── SKILL.md
  ├── cookbook/
  ├── prompts/
  └── tools/
  ```

### Agents

- **Format**: Single `.md` file
- **Location**: `.claude/agents/`
- **Example**: Custom agent definitions

## Directory Structure

The script installs extensions into these directories:

```
~/.claude/                    # Global (default)
├── skills/
├── commands/
└── agents/

./.claude/                    # Local (with -l flag)
├── skills/
├── commands/
└── agents/
```

## Notes

- The script will create the target directory if it doesn't exist
- Existing extensions with the same name will be overwritten (with a warning)
- Files should have `.md` extension (warning shown if missing)
- Requires `curl` or `wget` for URL downloads
- The script uses `set -euo pipefail` for safety

## Error Handling

The script will exit with an error if:
- Invalid extension type is specified
- No sources are provided
- Source file/directory doesn't exist
- `.claude` directory doesn't exist when using `-l` flag
- Neither `curl` nor `wget` is available for URL downloads

## Tips

- Use `-l` when working on project-specific extensions
- Use `-g` (or omit, as it's default) for extensions you want across all projects
- You can use both singular and plural forms: `skill` or `skills`, `command` or `commands`
- Install multiple extensions at once for efficiency

## License

This script is provided as-is for use with Claude Code.
