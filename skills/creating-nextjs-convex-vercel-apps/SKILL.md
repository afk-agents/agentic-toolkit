---
name: creating-nextjs-convex-vercel-apps
description: Create and deploy a new Next.js application with Convex backend and Vercel hosting. Use when setting up a new fullstack app, creating a Next.js project with Convex, or deploying to Vercel with Convex integration.
---

# Creating Next.js + Convex + Vercel Apps



## Variables

- **APP_NAME**: Lowercase letters, numbers, and hyphens only (e.g., `my-cool-app`)
- **PROJECT_DIR**: `~/code/projects/[APP_NAME]`
- **GITHUB_ORG**: `afk-agents`
- **CONVEX_TEAM_SLUG**: `nathan-amick`

**Important:** Always use the full `PROJECT_DIR` path when running commands. When a command needs to run in the project directory, `cd` into it first, then use `cd -` afterward to return to the previous directory:
```bash
cd ~/code/projects/my-app && bun install && cd -
```

## Workflow

```
Task Progress:
- [ ] Step 1: Create Next.js app and push to GitHub
- [ ] Step 2: Create Convex project (dev deployment)
- [ ] Step 3: Create deploy key for dev deployment
- [ ] Step 4: Write .env.local
- [ ] Step 5: Add dependencies and push schema
- [ ] Step 6: Create Convex production deployment
- [ ] Step 7: Create deploy key for production
- [ ] Step 8: Create Vercel project
- [ ] Step 9: Deploy to Vercel
```

---

### Step 1: Create Next.js App and Push to GitHub

Run the setup script (creates directory, Next.js app, copies Convex files, initializes git, creates GitHub repo):
```bash
./scripts/setup_nextjs_app.py [APP_NAME] --github-org [GITHUB_ORG] --base-dir ~/code/projects
```

---

### Step 2: Create Convex Project (Dev Deployment)

Use `/convex-manager` to create a new project:
- Project name: `[APP_NAME]`
- Deployment type: `dev`

Expected output - save `projectId`, `deploymentName`, and `deploymentUrl`:
```json
{
  "projectId": 123456,
  "deploymentName": "example-slug-789",
  "deploymentUrl": "https://example-slug-789.convex.cloud"
}
```

---

### Step 3: Create Deploy Key for Dev Deployment

Use `/convex-manager` to create a deploy key:
- Deployment name: `[DEV_DEPLOYMENT_NAME]`
- Key name: `dev-deploy`

Expected output - save `deployKey`:
```json
{
  "deployKey": "dev:example-slug-789|eyJ2Mi..."
}
```

---

### Step 4: Write .env.local

Create `[PROJECT_DIR]/.env.local`:
```env
# Deployment used by `bunx convex dev`
CONVEX_DEPLOYMENT=[DEV_DEPLOYMENT_NAME]
NEXT_PUBLIC_CONVEX_URL=[DEPLOYMENT_URL]
```

---

### Step 5: Add Dependencies and Push Schema

```bash
cd [PROJECT_DIR] && bun add convex @convex-dev/auth && cd -
cd [PROJECT_DIR] && CONVEX_DEPLOY_KEY='[DEV_DEPLOY_KEY]' bunx convex dev --once && cd -
```

---

### Step 6: Create Convex Production Deployment

Use `/convex-manager` to create a production deployment:
- Project ID: `[PROJECT_ID]` (from Step 2)
- Team slug: `[CONVEX_TEAM_SLUG]`

Expected output - save `deploymentName`:
```json
{
  "deploymentName": "prod-slug-123",
  "deploymentUrl": "https://prod-slug-123.convex.cloud"
}
```

---

### Step 7: Create Deploy Key for Production

Use `/convex-manager` to create a deploy key:
- Deployment name: `[PROD_DEPLOYMENT_NAME]`
- Key name: `vercel-deploy`

Expected output - save `deployKey` for Vercel:
```json
{
  "deployKey": "prod:prod-slug-123|eyJ2Mi..."
}
```

---

### Step 8: Create Vercel Project

Use `/vercel-manager` to create a project:
- Name: `[APP_NAME]`
- Framework: `nextjs`
- Build command: `bunx convex deploy --cmd 'bun run build'`
- Install command: `bun install`
- Git repository: `[GITHUB_ORG]/[APP_NAME]` (type: github)
- Environment variables:
  - `CONVEX_DEPLOY_KEY`: `[PROD_DEPLOY_KEY]` (encrypted, targets: production, preview)

---

### Step 9: Deploy to Vercel

Use `/vercel-manager` to deploy:
- Project directory: `[PROJECT_DIR]`

Expected output:
```json
{
  "status": "success",
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

