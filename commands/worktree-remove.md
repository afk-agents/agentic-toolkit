---
allowed-tools: Bash, AskUserQuestion
description: Remove a git worktree
---

# Worktree Remove

Remove a git worktree and optionally delete its associated branch.

## Instructions

1. **List Available Worktrees**: Show user which worktrees exist
2. **Get Worktree to Remove**: From $ARGUMENTS or ask user
3. **Confirm Removal**: Ask for confirmation before removing
4. **Remove Worktree**: Use `git worktree remove`
5. **Handle Branch**: Ask if associated branch should be deleted

## Workflow

### 1. List Worktrees
```bash
git worktree list
```

### 2. Parse Arguments
- Worktree path/name from $ARGUMENTS
- If empty, show list and ask user to select

### 3. Confirm Removal
Use AskUserQuestion to confirm:
- Which worktree to remove
- Whether to delete the associated branch
- Force removal if worktree has uncommitted changes

### 4. Remove Worktree
Basic removal:
```bash
git worktree remove <path>
```

Force removal (if needed):
```bash
git worktree remove --force <path>
```

### 5. Delete Branch (Optional)
If user confirms branch deletion:
```bash
git branch -d <branch-name>
```

Or force delete:
```bash
git branch -D <branch-name>
```

## Safety Checks

- Warn if worktree has uncommitted changes
- Warn if branch has unpushed commits
- Require explicit confirmation for force operations
- Don't allow removing the main worktree

## Examples

**Remove specific worktree:**
```
/worktree-remove worktrees/feature-branch
```

**Interactive removal:**
```
/worktree-remove
```
Then select from list and confirm options.

## Arguments

$ARGUMENTS
