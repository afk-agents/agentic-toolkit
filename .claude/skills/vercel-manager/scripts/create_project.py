#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["httpx"]
# ///
"""Create a Vercel project with optional GitHub integration, environment variables,
framework settings, and build command overrides.

Usage:
    echo '{"name": "my-project", ...}' | uv run create_project.py
    uv run create_project.py < config.json
    uv run create_project.py config.json

Input JSON format:
{
  "name": "my-project",           // Required
  "framework": "nextjs",          // Optional: nextjs, vite, remix, etc.
  "buildCommand": "npm run build", // Optional: override build command
  "installCommand": "npm install", // Optional: override install command
  "outputDirectory": ".next",     // Optional: override output directory
  "gitRepository": {              // Optional: link to GitHub repo
    "repo": "owner/repo-name",
    "type": "github"
  },
  "envVars": [                    // Optional: environment variables
    {
      "key": "DATABASE_URL",
      "value": "postgresql://...",
      "type": "encrypted",        // "encrypted" or "plain"
      "target": ["production", "preview"]
    }
  ]
}
"""

import json
import sys
from pathlib import Path
from typing import Any

import httpx

VERCEL_API_BASE = "https://api.vercel.com"


def find_env_file() -> Path | None:
    """Find .env file by searching up from current directory."""
    current = Path.cwd()

    for _ in range(5):
        env_path = current / ".env"
        if env_path.exists():
            return env_path

        parent = current.parent
        if parent == current:
            break
        current = parent

    return None


def load_env_token() -> str:
    """Load VERCEL_TOKEN from .env file."""
    env_path = find_env_file()

    if not env_path:
        print(
            "Error: .env file not found in current directory or parent directories",
            file=sys.stderr,
        )
        print("Please create a .env file with VERCEL_TOKEN=your_token", file=sys.stderr)
        sys.exit(1)

    token = None
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith("VERCEL_TOKEN="):
                value = line.split("=", 1)[1].strip()
                token = value.split()[0].split("#")[0].strip()
                if token.startswith('"') and token.endswith('"'):
                    token = token[1:-1]
                elif token.startswith("'") and token.endswith("'"):
                    token = token[1:-1]
                break

    if not token:
        print("Error: VERCEL_TOKEN not found in .env file", file=sys.stderr)
        print(f"Checked: {env_path}", file=sys.stderr)
        sys.exit(1)

    return token


def read_input() -> str:
    """Read input from file argument or stdin."""
    args = sys.argv[1:]

    if args and Path(args[0]).exists():
        return Path(args[0]).read_text()

    if not sys.stdin.isatty():
        return sys.stdin.read()

    return ""


def create_project(token: str, config: dict[str, Any]) -> None:
    """Create a Vercel project using the REST API."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    request_body: dict[str, Any] = {"name": config["name"]}

    if config.get("framework"):
        request_body["framework"] = config["framework"]

    if config.get("buildCommand"):
        request_body["buildCommand"] = config["buildCommand"]

    if config.get("installCommand"):
        request_body["installCommand"] = config["installCommand"]

    if config.get("outputDirectory"):
        request_body["outputDirectory"] = config["outputDirectory"]

    if config.get("gitRepository"):
        request_body["gitRepository"] = {
            "repo": config["gitRepository"]["repo"],
            "type": config["gitRepository"]["type"],
        }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{VERCEL_API_BASE}/v11/projects",
                headers=headers,
                json=request_body,
            )

            if response.status_code == 401:
                print(
                    "Error: Unauthorized - verify your token is correct", file=sys.stderr
                )
                sys.exit(1)

            if response.status_code == 409:
                print("Error: Project with this name already exists", file=sys.stderr)
                sys.exit(1)

            if response.status_code not in (200, 201):
                print(
                    f"HTTP Error {response.status_code}: {response.text}",
                    file=sys.stderr,
                )
                sys.exit(1)

            project_data = response.json()
            project_id = project_data.get("id")
            print(
                f"Project created: {project_data.get('name')} ({project_id})",
                file=sys.stderr,
            )

            env_vars_added = 0
            if config.get("envVars"):
                env_response = client.post(
                    f"{VERCEL_API_BASE}/v10/projects/{project_id}/env",
                    headers=headers,
                    params={"upsert": "true"},
                    json=[
                        {
                            "key": env["key"],
                            "value": env["value"],
                            "type": env["type"],
                            "target": env["target"],
                        }
                        for env in config["envVars"]
                    ],
                )

                if env_response.status_code not in (200, 201):
                    print(
                        f"Warning: Failed to add env vars: {env_response.text}",
                        file=sys.stderr,
                    )
                else:
                    env_data = env_response.json()
                    env_vars_added = (
                        len(env_data) if isinstance(env_data, list) else 1
                    )
                    print(
                        f"Environment variables added: {env_vars_added}",
                        file=sys.stderr,
                    )

            result = {
                "id": project_id,
                "name": project_data.get("name"),
                "framework": config.get("framework"),
                "buildCommand": config.get("buildCommand"),
                "installCommand": config.get("installCommand"),
                "outputDirectory": config.get("outputDirectory"),
                "gitRepository": config.get("gitRepository"),
                "envVarsAdded": env_vars_added,
            }

            print(json.dumps(result, indent=2))

    except httpx.TimeoutException:
        print("Error: Request timed out", file=sys.stderr)
        sys.exit(1)
    except httpx.RequestError as e:
        print(f"Error making request: {e}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    """Main entry point."""
    token = load_env_token()

    input_text = read_input()
    if not input_text.strip():
        print("Error: No input provided", file=sys.stderr)
        print(
            'Usage: echo \'{"name": "my-project"}\' | uv run create_project.py',
            file=sys.stderr,
        )
        print("   or: uv run create_project.py config.json", file=sys.stderr)
        sys.exit(1)

    try:
        config = json.loads(input_text)
    except json.JSONDecodeError:
        print("Error: Invalid JSON input", file=sys.stderr)
        sys.exit(1)

    if not config.get("name"):
        print("Error: 'name' is required in the input JSON", file=sys.stderr)
        sys.exit(1)

    create_project(token, config)


if __name__ == "__main__":
    main()
