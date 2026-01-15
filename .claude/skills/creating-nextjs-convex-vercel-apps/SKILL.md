---
name: creating-nextjs-convex-vercel-apps
description: Create a new Next.js application in the current directory using bun as the package manager, with TypeScript enabled and default settings. Use when creating a new Next.js application with Convex and Vercel.
---

# Creating Next.js, Convex, and Vercel Apps

This skill creates a new Next.js application in the current directory using bun as the package manager, with TypeScript enabled and default settings.

## Variables
- APP_NAME: Must contain only lowercase letters, numbers, and hyphens
- GITHUB_ORG_NAME: "afk-agents"

## App creation workflow

Copy this checklist and check off items as you complete them:

```
Task Progress:
- [ ] Step 1: Create app directory
- [ ] Step 2: Create Next.js app
- [ ] Step 3: Add Convex
- [ ] Step 4: Add Convex Auth
- [ ] Step 5: Push to Github
- [ ] Step 6: Add Vercel
- [ ] Step 7: Deploy to Vercel
```

**Step 0: Prerequisites**
- For each command you run in the following steps (if it requires you to be in the [APP_NAME] directory), surround the command with `cd [APP_NAME] &&` and `cd -` to return to the previous directory.  Example: `cd [APP_NAME] && bun add convex && cd -`

**Step 1: Create app directory**

- `mkdir [APP_NAME]`

**Step 2: Create Next.js app**

- `bun create next-app@latest . --use-bun --typescript --yes`

**Step 3: Add Convex**

- Copy all the files from the ./assets/convex directory to the [APP_NAME]/convex directory
- Use the /convex-manager skill to create a new Convex project
- Write the `deploymentName` and `deploymentUrl` to the .env.local file in the [APP_NAME] directory
  ```env
  # Deployment used by `bunx convex dev`
  CONVEX_DEPLOYMENT=[deploymentName]
  NEXT_PUBLIC_CONVEX_URL=[deploymentUrl]
  ```
- Add the convex and convex auth dependency with `bun add convex @convex-dev/auth`
- Run `bunx convex dev --once` to generate and push code to the configured dev deployment

**Step 4: Add Convex Auth**

- Skip for now, we'll add it later

**Step 5: Push to Github**

- Initialize git and create initial commit:
  ```bash
  git init && git add . && git commit -m "Initial commit: Next.js app with Convex"
  ```
- Create Github repository and push:
  ```bash
  gh repo create [GITHUB_ORG_NAME]/[APP_NAME] --public --source=. --remote=origin --push
  ```

**Step 6: Add Vercel**

- Use the /convex-manager skill to create a production deployment for the project:
  - Operation: `create_production_deployment [PROJECT_ID]`
  - Note the production deployment name from the output (e.g., `grateful-fennec-131`)
- Use the /convex-manager skill to create a deploy key for the production deployment:
  - Operation: `create_deploy_key [PROD_DEPLOYMENT_NAME] vercel-deploy`
  - Save the `deployKey` value from the output
- Use the /vercel-manager skill to create a new Vercel project with:
  - `name`: [APP_NAME]
  - `framework`: nextjs
  - `buildCommand`: `bunx convex deploy --cmd 'bun run build'`
  - `installCommand`: `bun install`
  - `gitRepository`: `{ "repo": "[GITHUB_ORG_NAME]/[APP_NAME]", "type": "github" }`
  - `envVars`: Add `CONVEX_DEPLOY_KEY` with the deploy key from above, target `["production", "preview"]`
- Use the /vercel-manager skill to create a new Vercel production deployment

**Step 7: Deploy to Vercel**

- Deploy to Vercel production: `bunx vercel deploy --prod --yes`