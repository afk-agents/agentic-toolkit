'vercel-manager' - this skill is similar to the convex-manager skill, but for Vercel.
  The skill should note that it will use the VERCEL_TOKEN located in the .env file.


  The skill should note that it will use the VERCEL_TOKEN located in the .env file.

  Instead of uv and python, these scripts will be typescript using bun and the vercel sdk https://docs.vercel.com/docs/rest-api/reference/sdk. (DO NOT use a simple REST API call, use the vercel sdk instead.)

  We want this to be portable without having to run bun install.  Under vercel-manager/scripts/src put the typescript files for the commands.  We'll use a bun's single-file executable feature to create a single executable file for the skill.
  docs: https://bun.com/docs/bundler/executables.md

  Start by setting up the skill with the ability to list projects. (We'll add more commands later.)