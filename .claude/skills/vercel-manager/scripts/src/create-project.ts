#!/usr/bin/env bun
/**
 * Create a Vercel project with optional GitHub integration, environment variables,
 * framework settings, and build command overrides.
 *
 * Usage:
 *   echo '{"name": "my-project", ...}' | ./create-project
 *   ./create-project < config.json
 *   ./create-project config.json
 *
 * Input JSON format:
 * {
 *   "name": "my-project",           // Required
 *   "framework": "nextjs",          // Optional: nextjs, vite, remix, etc.
 *   "buildCommand": "npm run build", // Optional: override build command
 *   "installCommand": "npm install", // Optional: override install command
 *   "outputDirectory": ".next",     // Optional: override output directory
 *   "gitRepository": {              // Optional: link to GitHub repo
 *     "repo": "owner/repo-name",
 *     "type": "github"
 *   },
 *   "envVars": [                    // Optional: environment variables
 *     {
 *       "key": "DATABASE_URL",
 *       "value": "postgresql://...",
 *       "type": "encrypted",        // "encrypted" or "plain"
 *       "target": ["production", "preview"]
 *     }
 *   ]
 * }
 */

import { Vercel } from "@vercel/sdk";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";

interface EnvVar {
  key: string;
  value: string;
  type: "encrypted" | "plain";
  target: Array<"production" | "preview" | "development">;
}

interface GitRepository {
  repo: string;
  type: "github" | "gitlab" | "bitbucket";
}

interface ProjectConfig {
  name: string;
  framework?: string;
  buildCommand?: string;
  installCommand?: string;
  outputDirectory?: string;
  gitRepository?: GitRepository;
  envVars?: EnvVar[];
}

function findEnvFile(): string | null {
  let current = process.cwd();

  for (let i = 0; i < 5; i++) {
    const envPath = join(current, ".env");
    if (existsSync(envPath)) {
      return envPath;
    }

    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return null;
}

function loadEnvToken(): string {
  const envPath = findEnvFile();

  if (!envPath) {
    console.error("Error: .env file not found in current directory or parent directories");
    console.error("Please create a .env file with VERCEL_TOKEN=your_token");
    process.exit(1);
  }

  const content = readFileSync(envPath, "utf-8");
  let token: string | null = null;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("VERCEL_TOKEN=")) {
      token = trimmed.slice("VERCEL_TOKEN=".length).trim();
      if ((token.startsWith('"') && token.endsWith('"')) ||
          (token.startsWith("'") && token.endsWith("'"))) {
        token = token.slice(1, -1);
      }
      break;
    }
  }

  if (!token) {
    console.error("Error: VERCEL_TOKEN not found in .env file");
    console.error(`Checked: ${envPath}`);
    process.exit(1);
  }

  return token;
}

async function readInput(): Promise<string> {
  const args = process.argv.slice(2);

  // If a file path is provided as argument, read from it
  if (args.length > 0 && existsSync(args[0])) {
    return readFileSync(args[0], "utf-8");
  }

  // Otherwise read from stdin
  const chunks: Buffer[] = [];
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

async function createProject(token: string, config: ProjectConfig): Promise<void> {
  const vercel = new Vercel({
    bearerToken: token,
  });

  try {
    // Build the create project request
    const requestBody: Record<string, unknown> = {
      name: config.name,
    };

    if (config.framework) {
      requestBody.framework = config.framework;
    }

    if (config.buildCommand) {
      requestBody.buildCommand = config.buildCommand;
    }

    if (config.installCommand) {
      requestBody.installCommand = config.installCommand;
    }

    if (config.outputDirectory) {
      requestBody.outputDirectory = config.outputDirectory;
    }

    if (config.gitRepository) {
      requestBody.gitRepository = {
        repo: config.gitRepository.repo,
        type: config.gitRepository.type,
      };
    }

    // Create the project
    const createResponse = await vercel.projects.createProject({
      requestBody: requestBody as Parameters<typeof vercel.projects.createProject>[0]["requestBody"],
    });

    const projectId = createResponse.id;
    console.error(`Project created: ${createResponse.name} (${projectId})`);

    // Add environment variables if provided
    if (config.envVars && config.envVars.length > 0) {
      const envResponse = await vercel.projects.createProjectEnv({
        idOrName: projectId,
        upsert: "true",
        requestBody: config.envVars.map((env) => ({
          key: env.key,
          value: env.value,
          type: env.type,
          target: env.target,
        })),
      });

      const created = Array.isArray(envResponse) ? envResponse : [envResponse];
      console.error(`Environment variables added: ${created.length}`);
    }

    // Output the result as JSON
    const result = {
      id: projectId,
      name: createResponse.name,
      framework: config.framework ?? null,
      buildCommand: config.buildCommand ?? null,
      installCommand: config.installCommand ?? null,
      outputDirectory: config.outputDirectory ?? null,
      gitRepository: config.gitRepository ?? null,
      envVarsAdded: config.envVars?.length ?? 0,
    };

    console.log(JSON.stringify(result, null, 2));

  } catch (error: unknown) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const e = error as { statusCode: number; message?: string; body?: unknown };
      if (e.statusCode === 401) {
        console.error("Error: Unauthorized - verify your token is correct");
        process.exit(1);
      }
      if (e.statusCode === 409) {
        console.error("Error: Project with this name already exists");
        process.exit(1);
      }
      console.error(`HTTP Error ${e.statusCode}: ${e.message ?? "Unknown error"}`);
      if (e.body) {
        console.error("Details:", JSON.stringify(e.body, null, 2));
      }
      process.exit(1);
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const token = loadEnvToken();

  const input = await readInput();
  if (!input.trim()) {
    console.error("Error: No input provided");
    console.error("Usage: echo '{\"name\": \"my-project\"}' | ./create-project");
    console.error("   or: ./create-project config.json");
    process.exit(1);
  }

  let config: ProjectConfig;
  try {
    config = JSON.parse(input);
  } catch {
    console.error("Error: Invalid JSON input");
    process.exit(1);
  }

  if (!config.name) {
    console.error("Error: 'name' is required in the input JSON");
    process.exit(1);
  }

  await createProject(token, config);
}

main().catch((error) => {
  console.error("Error creating project:", error);
  process.exit(1);
});
