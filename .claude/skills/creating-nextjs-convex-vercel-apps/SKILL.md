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
- TODO: create production deployment

**Step 4: Add Convex Auth**

- Skip for now, we'll add it later

**Step 5: Push to Github**

- Initialize a new Github repository with `gh repo create [GITHUB_ORG_NAME]/[APP_NAME] --public --source=. --remote=origin`

**Step 6: Add Vercel**

- Use the /convex-manager skill to create a new production deploy key (the CONVEX_DEPLOY_KEY key needed below)
- Run `bunx vercel --help && bunx vercel env --help && bunx vercel projects --help` to see all the available commands
- Use `bunx vercel projects` to create a new Vercel project
- Use `bunx vercel env` to add the CONVEX_DEPLOY_KEY key to the production environment

**Step 7: Deploy to Vercel**

- Use `bunx vercel deploy --prod` to deploy the app to Vercel