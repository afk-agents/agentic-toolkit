---
name: vercel-manager
description: Manage Vercel projects and deployments via the Vercel SDK. Use when listing, creating, or managing Vercel projects, deployments, or domains. Requires VERCEL_TOKEN in .env file.
---

# Vercel Manager

## Setup

Executables are not checked into git. If `scripts/bin/` is empty, build them first:

```bash
cd .claude/skills/vercel-manager/scripts
bun install
bun build --compile src/list-projects.ts --outfile bin/list-projects
bun build --compile src/create-project.ts --outfile bin/create-project
```

## Available Operations

### List Projects

List all Vercel projects for your account or team:

```bash
.claude/skills/vercel-manager/scripts/bin/list-projects
```

Output format:
```json
{
  "projects": [
    {
      "id": "prj_abc123",
      "name": "my-project",
      "framework": "nextjs",
      "createdAt": "2023-01-15T08:30:00Z"
    }
  ]
}
```

### Create Project

Create a new Vercel project with optional GitHub integration, environment variables, framework, and build command overrides:

```bash
echo '<json>' | .claude/skills/vercel-manager/scripts/bin/create-project
```

**Input JSON format:**
```json
{
  "name": "my-project",
  "framework": "nextjs",
  "buildCommand": "npx convex deploy --cmd 'npm run build'",
  "installCommand": "npm install",
  "outputDirectory": ".next",
  "gitRepository": {
    "repo": "owner/repo-name",
    "type": "github"
  },
  "envVars": [
    {
      "key": "DATABASE_URL",
      "value": "postgresql://...",
      "type": "encrypted",
      "target": ["production", "preview"]
    }
  ]
}
```

**Fields:**
- `name` (required): Project name
- `framework` (optional): `nextjs`, `vite`, `remix`, `nuxtjs`, `gatsby`, `astro`, etc.
- `buildCommand` (optional): Override the build command
- `installCommand` (optional): Override the install command
- `outputDirectory` (optional): Override the output directory
- `gitRepository` (optional): Link to a GitHub/GitLab/Bitbucket repo
  - `repo`: `owner/repo-name` format
  - `type`: `github`, `gitlab`, or `bitbucket`
- `envVars` (optional): Array of environment variables
  - `key`: Variable name
  - `value`: Variable value
  - `type`: `encrypted` or `plain`
  - `target`: Array of `production`, `preview`, `development`

**Examples:**

Simple project:
```bash
echo '{"name": "my-app"}' | .claude/skills/vercel-manager/scripts/bin/create-project
```

Next.js with Convex:
```bash
echo '{
  "name": "my-convex-app",
  "framework": "nextjs",
  "buildCommand": "npx convex deploy --cmd '\''npm run build'\''",
  "gitRepository": {
    "repo": "myorg/my-convex-app",
    "type": "github"
  },
  "envVars": [
    {"key": "CONVEX_DEPLOY_KEY", "value": "prod:xxx", "type": "encrypted", "target": ["production"]}
  ]
}' | .claude/skills/vercel-manager/scripts/bin/create-project
```

### Deploy to Production

Deploy a project to Vercel production:

```bash
uv run .claude/skills/vercel-manager/scripts/deploy.py <project_directory>
```

**Arguments:**
- `project_directory`: Path to the project to deploy (required)

**Example:**
```bash
uv run .claude/skills/vercel-manager/scripts/deploy.py ./my-app
```

Output format:
```json
{
  "status": "success",
  "projectDirectory": "/path/to/my-app",
  "deploymentUrl": "https://my-app.vercel.app"
}
```

This script:
- Reads VERCEL_TOKEN from the .env file
- Runs `bunx vercel deploy --prod --yes` with the token
- Returns the deployment URL on success

## Building Scripts

Scripts are TypeScript files compiled to single-file executables using bun:

```bash
cd .claude/skills/vercel-manager/scripts
bun build --compile src/list-projects.ts --outfile bin/list-projects
bun build --compile src/create-project.ts --outfile bin/create-project
```

## Error Handling

**Missing .env file**:
```
Error: .env file not found in current directory or parent directories
```
Create a `.env` file at the project root with your VERCEL_TOKEN.

**Missing token in .env**:
```
Error: VERCEL_TOKEN not found in .env file
```
Add `VERCEL_TOKEN=your_token` to your .env file.

**Invalid token**:
```
Error: Unauthorized - verify your token is correct
```
Get a new token from the Vercel Dashboard under Account Settings > Tokens.

**Project already exists**:
```
Error: Project with this name already exists
```
Choose a different project name.
