---
name: managing-worktrees
description: Manage git worktrees for parallel development. Use when creating, listing, removing, or pruning worktrees, or when the user mentions worktrees, parallel branches, or isolated development environments.
allowed-tools: Bash, Read, AskUserQuestion
---

# Managing Git Worktrees

Manage git worktrees in the `worktrees/` directory for working on multiple branches simultaneously.

## Operations

Determine the operation from context or $ARGUMENTS:

- **Create**: "create", "add", "new worktree", or a branch name
- **List**: "list", "show", "status"
- **Remove**: "remove", "delete", "rm"
- **Prune**: "prune", "clean", "cleanup"

## Create Worktree

Create a new worktree for a branch.

1. Validate git repository:
   ```bash
   git rev-parse --git-dir
   ```

2. Get branch name from $ARGUMENTS or ask user

3. Ask if creating new branch or checking out existing

4. Create worktree:
   ```bash
   # Existing branch
   git worktree add worktrees/<branch-name> <branch-name>

   # New branch
   git worktree add -b <branch-name> worktrees/<branch-name>
   ```

5. Report path: `worktrees/<branch-name>`

## List Worktrees

Display all worktrees with status.

1. Get worktree information:
   ```bash
   git worktree list
   git worktree list --porcelain
   ```

2. Present clearly:
   - Path (relative when possible)
   - Branch name
   - Commit hash and message
   - Status (locked, prunable)

**Example output:**
```
Main Worktree:
  Path: /Users/name/project
  Branch: main
  Commit: abc1234 Latest changes

Worktrees:
  Path: worktrees/feature-x
  Branch: feature-x
  Commit: def5678 Add feature
```

## Remove Worktree

Remove a worktree and optionally its branch.

1. List worktrees:
   ```bash
   git worktree list
   ```

2. Get worktree to remove from $ARGUMENTS or ask user

3. Confirm removal and ask about branch deletion

4. Remove worktree:
   ```bash
   git worktree remove <path>
   # Force if uncommitted changes:
   git worktree remove --force <path>
   ```

5. Delete branch if requested:
   ```bash
   git branch -d <branch-name>
   # Force if unpushed:
   git branch -D <branch-name>
   ```

**Safety checks:**
- Warn about uncommitted changes
- Warn about unpushed commits
- Require confirmation for force operations
- Never remove main worktree

## Prune Worktrees

Clean up stale worktree metadata.

1. Check what would be pruned:
   ```bash
   git worktree prune --dry-run --verbose
   ```

2. Show current worktrees:
   ```bash
   git worktree list
   ```

3. Explain findings (stale entries, reasons)

4. Prune:
   ```bash
   git worktree prune --verbose
   ```

5. Verify:
   ```bash
   git worktree list
   ```

**When to use:**
- After manually deleting worktree directories
- When git shows non-existent worktrees
- When getting "worktree already exists" errors

**Safety:** Only removes metadata for already-deleted directories. Does not delete worktree directories or branches.

## Arguments

$ARGUMENTS
