---
name: convex-manager
description: Manage Convex projects and deployments via the Management API. Use when listing, creating, or managing Convex projects, deployments, or team resources. Requires CONVEX_TOKEN in .env file.
---

# Convex Manager

## Available Operations

### List Projects

List all Convex projects for your team:

```bash
uv run .claude/skills/convex-manager/scripts/list_projects.py
```

Output format:
```json
{
  "projects": [
    {
      "id": 123,
      "name": "my-project",
      "slug": "my-project",
      "deployments": [...]
    }
  ]
}
```

The script automatically:
- Reads CONVEX_TOKEN from the .env file
- Calls the token details endpoint to get your team ID
- Lists all projects for your team

### Create Project

Create a new Convex project:

```bash
uv run .claude/skills/convex-manager/scripts/create_project.py <project_name> [deployment_type]
```

**Arguments:**
- `project_name`: Name of the project to create (required)
- `deployment_type`: Either `dev` or `prod` (optional, default: `dev`)

**Example:**
```bash
uv run .claude/skills/convex-manager/scripts/create_project.py my-new-app dev
```

Output format:
```json
{
  "projectId": 456,
  "deploymentName": "my-new-app",
  "deploymentUrl": "https://example-slug-789.convex.cloud"
}
```

### Delete Project

Delete a project and all its deployments:

```bash
uv run .claude/skills/convex-manager/scripts/delete_project.py <project_id>
```

**Arguments:**
- `project_id`: Numeric ID of the project to delete (required)

**Example:**
```bash
uv run .claude/skills/convex-manager/scripts/delete_project.py 456
```

**WARNING:** This permanently deletes the project and ALL its deployments. Use `list_projects.py` to find project IDs before deleting.

Output format:
```json
{
  "status": "success",
  "message": "Project 456 deleted"
}
```

### List Deployments

List all deployments for a project:

```bash
uv run .claude/skills/convex-manager/scripts/list_deployments.py <project_id>
```

**Arguments:**
- `project_id`: Numeric ID of the project (required)

**Example:**
```bash
uv run .claude/skills/convex-manager/scripts/list_deployments.py 1209929
```

Output format:
```json
[
  {
    "name": "playful-otter-123",
    "deploymentType": "dev",
    "createTime": 1760880185840,
    "projectId": 1209929
  },
  {
    "name": "happy-whale-456",
    "deploymentType": "prod",
    "createTime": 1760880185840,
    "projectId": 1209929
  }
]
```

### Create Deploy Key

Create a deploy key for a deployment:

```bash
uv run .claude/skills/convex-manager/scripts/create_deploy_key.py <deployment_name> <key_name>
```

**Arguments:**
- `deployment_name`: Name of the deployment (required, e.g., 'playful-otter-123')
- `key_name`: Name for the deploy key (required)

**Example:**
```bash
uv run .claude/skills/convex-manager/scripts/create_deploy_key.py playful-otter-123 ci-deploy-key
```

Output format:
```json
{
  "deployKey": "dev:playful-otter-123|ey..."
}
```

**Note:** When using OAuth tokens, the deploy key inherits OAuth permissions. Otherwise, a deployment-specific token is created.

## API Reference

For complete Management API documentation, see [api-reference.md](api-reference.md).

## Error Handling

**Missing .env file**:
```
Error: .env file not found in current directory or parent directories
```
Create a `.env` file at the project root with your CONVEX_TOKEN.

**Missing token in .env**:
```
Error: CONVEX_TOKEN not found in .env file
```
Add `CONVEX_TOKEN=your_token` to your .env file.

**Invalid token**:
```
HTTP Error 401: Unauthorized
```
Verify your token is correct and hasn't expired. Get a new token from the Convex Dashboard.
