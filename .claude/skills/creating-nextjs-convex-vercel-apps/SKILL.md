---
name: creating-nextjs-convex-vercel-apps
description: Create and deploy a new Next.js application with Convex backend and Vercel hosting. Use when setting up a new fullstack app, creating a Next.js project with Convex, or deploying to Vercel with Convex integration.
---

# Creating Next.js + Convex + Vercel Apps

Creates a new Next.js app with Convex backend, pushes to GitHub, and deploys to Vercel with CI/CD.

## Variables

- **APP_NAME**: Lowercase letters, numbers, and hyphens only (e.g., `my-cool-app`)
- **GITHUB_ORG**: `afk-agents`
- **CONVEX_TEAM_SLUG**: `nathan-amick`

## Workflow

```
Task Progress:
- [ ] Step 1: Create app directory and Next.js app
- [ ] Step 2: Add Convex with dev deployment
- [ ] Step 3: Push to GitHub
- [ ] Step 4: Create Convex production deployment
- [ ] Step 5: Create Vercel project and deploy
```

---

### Step 1: Create App Directory and Next.js App

```bash
mkdir [APP_NAME]
cd [APP_NAME] && bun create next-app@latest . --use-bun --typescript --yes && cd -
```

---

### Step 2: Add Convex with Dev Deployment

**2a. Copy Convex assets:**
```bash
mkdir -p [APP_NAME]/convex
```
Copy all files from `./assets/convex/` to `[APP_NAME]/convex/`.

**2b. Create Convex project (dev deployment):**

Use `/convex-manager` to create a new project:
- Project name: `[APP_NAME]`
- Deployment type: `dev`

Expected output:
```json
{
  "projectId": 123456,
  "deploymentName": "example-slug-789",
  "deploymentUrl": "https://example-slug-789.convex.cloud"
}
```

Save `deploymentName` and `deploymentUrl`.

**2c. Create deploy key for dev deployment:**

Use `/convex-manager` to create a deploy key:
- Deployment name: `[DEV_DEPLOYMENT_NAME]`
- Key name: `dev-deploy`

Expected output:
```json
{
  "deployKey": "dev:example-slug-789|eyJ2Mi..."
}
```

**2d. Write `.env.local`:**
```env
# Deployment used by `bunx convex dev`
CONVEX_DEPLOYMENT=[DEV_DEPLOYMENT_NAME]
NEXT_PUBLIC_CONVEX_URL=[DEPLOYMENT_URL]
```

**2e. Add dependencies and push schema:**
```bash
cd [APP_NAME] && bun add convex @convex-dev/auth && cd -
cd [APP_NAME] && CONVEX_DEPLOY_KEY='[DEV_DEPLOY_KEY]' bunx convex dev --once && cd -
```

The `CONVEX_DEPLOY_KEY` environment variable enables non-interactive deployment.

---

### Step 3: Push to GitHub

```bash
cd [APP_NAME] && git init && git add . && git commit -m "Initial commit: Next.js app with Convex" && cd -
cd [APP_NAME] && gh repo create [GITHUB_ORG]/[APP_NAME] --public --source=. --remote=origin --push && cd -
```

---

### Step 4: Create Convex Production Deployment

**4a. Provision production deployment:**

Use `/convex-manager` to create a production deployment:
- Project ID: `[PROJECT_ID]` (from Step 2b)

Expected output:
```json
{
  "projectName": "my-app",
  "projectSlug": "my-app",
  "deploymentName": "prod-slug-123",
  "deploymentUrl": "https://prod-slug-123.convex.cloud",
  "status": "success"
}
```

Save `deploymentName` for the next step.

**4b. Create deploy key for production:**

Use `/convex-manager` to create a deploy key:
- Deployment name: `[PROD_DEPLOYMENT_NAME]`
- Key name: `vercel-deploy`

Expected output:
```json
{
  "deployKey": "prod:prod-slug-123|eyJ2Mi..."
}
```

Save this deploy key for Vercel.

---

### Step 5: Create Vercel Project and Deploy

**5a. Create Vercel project:**

Use `/vercel-manager` to create a project with this configuration:
- Name: `[APP_NAME]`
- Framework: `nextjs`
- Build command: `bunx convex deploy --cmd 'bun run build'`
- Install command: `bun install`
- Git repository: `[GITHUB_ORG]/[APP_NAME]` (type: github)
- Environment variables:
  - `CONVEX_DEPLOY_KEY`: `[PROD_DEPLOY_KEY]` (encrypted, targets: production, preview)

**5b. Deploy to Vercel:**

Use `/vercel-manager` to deploy the project:
- Project directory: `[APP_NAME]`

Expected output:
```json
{
  "status": "success",
  "projectDirectory": "/path/to/my-app",
  "deploymentUrl": "https://my-app.vercel.app"
}
```

---

## Output Summary

After completion, provide this summary:

| Resource | URL/Details |
|----------|-------------|
| **Live Site** | https://[APP_NAME].vercel.app |
| **GitHub Repo** | https://github.com/[GITHUB_ORG]/[APP_NAME] |
| **Convex Dev** | [DEV_DEPLOYMENT_NAME] (https://[DEV_DEPLOYMENT_NAME].convex.cloud) |
| **Convex Prod** | [PROD_DEPLOYMENT_NAME] (https://[PROD_DEPLOYMENT_NAME].convex.cloud) |
| **Vercel Project** | [APP_NAME] |

---

## Troubleshooting

**`bunx convex dev --once` prompts for login:**
- Set `CONVEX_DEPLOY_KEY` environment variable before running the command

**Production deployment creation fails:**
- Ensure you're using the correct `team_slug` and `project_slug`
- The project must exist (created in Step 2b)

**Vercel deploy fails:**
- Check that VERCEL_TOKEN is set in the `.env` file
- Ensure the project directory exists
