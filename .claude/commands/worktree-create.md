---
allowed-tools: Bash, Read, AskUserQuestion
description: Create a new git worktree in /worktrees directory
---

# Worktree Create

Create a new git worktree in the `/worktrees` directory for working on a specific branch in isolation.

## Instructions

1. **Validate Repository**: Ensure we're in a git repository
2. **Get Branch Name**: If not provided as $ARGUMENTS, ask the user for the branch name
3. **Check if Branch Exists**: Determine if this is a new or existing branch
4. **Create Worktree Directory**: Ensure `/worktrees` directory exists
5. **Create Worktree**: Use `git worktree add` to create the worktree

## Workflow

### 1. Validate Repository
```bash
git rev-parse --git-dir
```

### 2. Parse Arguments
- Branch name from $ARGUMENTS
- If empty, use AskUserQuestion to get branch name
- Ask if creating new branch or checking out existing branch

### 3. Create Worktree
For existing branch:
```bash
git worktree add worktrees/<branch-name> <branch-name>
```

For new branch:
```bash
git worktree add -b <branch-name> worktrees/<branch-name>
```

### 4. Report Success
- Confirm worktree created at `worktrees/<branch-name>`
- Show path to new worktree
- Optionally ask if user wants to open it in a new terminal/editor

## Examples

**User provides branch name:**
```
/worktree-create feature/new-login
```

**User provides no arguments:**
```
/worktree-create
```
Then prompt for branch name and whether it's new or existing.

## Arguments

$ARGUMENTS
