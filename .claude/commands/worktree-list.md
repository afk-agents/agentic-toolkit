---
allowed-tools: Bash
description: List all git worktrees and their status
---

# Worktree List

Display all git worktrees with their locations, branches, and status.

## Instructions

1. **List Worktrees**: Use `git worktree list` to show all worktrees
2. **Format Output**: Present the information in a clear, readable format
3. **Highlight Active**: Indicate which worktree is currently active

## Workflow

### 1. List All Worktrees
```bash
git worktree list
```

### 2. Get Detailed Information
```bash
git worktree list --porcelain
```

### 3. Format and Display
- Show path, branch, and commit hash
- Mark the main worktree (repository root)
- Mark worktrees in `/worktrees` directory
- Indicate any locked or prunable worktrees

## Output Format

Present information including:
- Worktree path (relative to repo root when possible)
- Branch name
- Current commit (short hash and message)
- Status (bare, locked, prunable)

## Example Output

```
Main Worktree:
  Path: /Users/namick/code/claude-experiments
  Branch: main
  Commit: 078cc87 Initial setup for Claude Code experiments

Worktrees:
  Path: worktrees/feature-branch
  Branch: feature-branch
  Commit: abc1234 Add new feature

  Path: worktrees/bugfix
  Branch: bugfix/issue-123
  Commit: def5678 Fix critical bug
```
