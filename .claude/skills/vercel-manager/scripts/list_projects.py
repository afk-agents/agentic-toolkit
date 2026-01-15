#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["httpx"]
# ///
"""List all Vercel projects for your account/team.

Reads VERCEL_TOKEN from .env file and calls the Vercel REST API
to list all projects.

Usage:
    uv run list_projects.py

Output:
    JSON object with "projects" array containing project details.
"""

import json
import sys
from pathlib import Path

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


def list_projects(token: str) -> None:
    """List all Vercel projects using the REST API."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(f"{VERCEL_API_BASE}/v10/projects", headers=headers)

            if response.status_code == 401:
                print(
                    "Error: Unauthorized - verify your token is correct", file=sys.stderr
                )
                print(
                    "Get a new token from Vercel Dashboard > Account Settings > Tokens",
                    file=sys.stderr,
                )
                sys.exit(1)

            if response.status_code != 200:
                print(
                    f"HTTP Error {response.status_code}: {response.text}",
                    file=sys.stderr,
                )
                sys.exit(1)

            data = response.json()

            projects = []
            for p in data.get("projects", []):
                projects.append(
                    {
                        "id": p.get("id"),
                        "name": p.get("name"),
                        "framework": p.get("framework"),
                        "createdAt": p.get("createdAt"),
                        "updatedAt": p.get("updatedAt"),
                    }
                )

            print(json.dumps({"projects": projects}, indent=2))

    except httpx.TimeoutException:
        print("Error: Request timed out", file=sys.stderr)
        sys.exit(1)
    except httpx.RequestError as e:
        print(f"Error making request: {e}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    """Main entry point."""
    token = load_env_token()
    list_projects(token)


if __name__ == "__main__":
    main()
