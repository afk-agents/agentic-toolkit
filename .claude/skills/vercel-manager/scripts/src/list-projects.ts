#!/usr/bin/env bun
/**
 * List all Vercel projects for your account/team.
 *
 * Reads VERCEL_TOKEN from .env file and calls the Vercel SDK
 * to list all projects.
 */

import { Vercel } from "@vercel/sdk";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";

function findEnvFile(): string | null {
  let current = process.cwd();

  // Search up to 5 levels up
  for (let i = 0; i < 5; i++) {
    const envPath = join(current, ".env");
    if (existsSync(envPath)) {
      return envPath;
    }

    const parent = dirname(current);
    if (parent === current) {
      // Reached root
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
      // Remove quotes if present
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

async function listProjects(token: string): Promise<void> {
  const vercel = new Vercel({
    bearerToken: token,
  });

  try {
    const result = await vercel.projects.getProjects({});

    // Format output to show key project info
    const projects = result.projects?.map(p => ({
      id: p.id,
      name: p.name,
      framework: p.framework ?? null,
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
      updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,
    })) ?? [];

    console.log(JSON.stringify({ projects }, null, 2));
  } catch (error: unknown) {
    if (error && typeof error === "object" && "statusCode" in error) {
      const e = error as { statusCode: number; message?: string };
      if (e.statusCode === 401) {
        console.error("Error: Unauthorized - verify your token is correct");
        console.error("Get a new token from Vercel Dashboard > Account Settings > Tokens");
        process.exit(1);
      }
      console.error(`HTTP Error ${e.statusCode}: ${e.message ?? "Unknown error"}`);
      process.exit(1);
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const token = loadEnvToken();
  await listProjects(token);
}

main().catch((error) => {
  console.error("Error listing projects:", error);
  process.exit(1);
});
