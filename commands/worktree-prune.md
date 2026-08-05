---
allowed-tools: Bash
description: Clean up stale git worktree metadata
---

# Worktree Prune

Remove stale administrative files for worktrees that have been manually deleted or are no longer valid.

## Instructions

1. **Check for Stale Worktrees**: Identify worktrees that need pruning
2. **Show What Will Be Pruned**: Display information before pruning
3. **Prune Stale Entries**: Remove invalid worktree metadata
4. **Report Results**: Show what was cleaned up

## Workflow

### 1. Dry Run (Check What Would Be Pruned)
```bash
git worktree prune --dry-run --verbose
```

### 2. Show Current Worktrees
```bash
git worktree list
```

### 3. Explain Findings
- List any stale worktree entries that will be removed
- Explain why they're being pruned (directory deleted, corrupted, etc.)
- If nothing to prune, report that all worktrees are valid

### 4. Prune Stale Entries
```bash
git worktree prune --verbose
```

### 5. Verify Results
```bash
git worktree list
```

## When to Use

Run this command when:
- You've manually deleted a worktree directory
- Git shows worktrees that no longer exist
- Cleaning up after filesystem operations
- Getting "worktree already exists" errors

## Output Format

Before pruning:
```
Checking for stale worktree metadata...

Found 2 stale worktree entries:
  - worktrees/old-feature (directory not found)
  - worktrees/deleted-branch (corrupted metadata)
```

After pruning:
```
Pruned 2 stale worktree entries.
All remaining worktrees are valid.
```

## Safety

This command is safe to run as it only removes metadata for worktrees whose directories are already gone or invalid. It does not delete any worktree directories or branches.
