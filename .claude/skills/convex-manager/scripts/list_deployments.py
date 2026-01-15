#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""List all deployments for a Convex project.

Reads CONVEX_TOKEN from .env file in project root and calls the
Convex Management API to list all deployments for a project.
"""

import argparse
import json
import sys
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


def find_env_file():
    """Find .env file by searching up from current directory."""
    current = Path.cwd()

    # Search up to 5 levels up
    for _ in range(5):
        env_path = current / ".env"
        if env_path.exists():
            return env_path

        parent = current.parent
        if parent == current:  # Reached root
            break
        current = parent

    return None


def load_env_token():
    """Load CONVEX_TOKEN from .env file."""
    env_path = find_env_file()

    if not env_path:
        print("Error: .env file not found in current directory or parent directories", file=sys.stderr)
        print("Please create a .env file with CONVEX_TOKEN=your_token", file=sys.stderr)
        sys.exit(1)

    # Simple .env parser - reads line by line
    token = None
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith("CONVEX_TOKEN="):
                token = line.split("=", 1)[1].strip()
                # Remove quotes if present
                if token.startswith('"') and token.endswith('"'):
                    token = token[1:-1]
                elif token.startswith("'") and token.endswith("'"):
                    token = token[1:-1]
                break

    if not token:
        print("Error: CONVEX_TOKEN not found in .env file", file=sys.stderr)
        print(f"Checked: {env_path}", file=sys.stderr)
        sys.exit(1)

    return token


def list_deployments(token, project_id):
    """List all deployments for a project."""
    url = f"https://api.convex.dev/v1/projects/{project_id}/list_deployments"

    try:
        req = Request(url)
        req.add_header("Authorization", f"Bearer {token}")

        with urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            return data

    except HTTPError as e:
        error_body = e.read().decode() if e.fp else "No error details"
        print(f"HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        print(f"Response: {error_body}", file=sys.stderr)
        sys.exit(1)
    except URLError as e:
        print(f"Network error: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error listing deployments: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="List all deployments for a Convex project.",
        epilog="Use list_projects.py to find project IDs."
    )
    parser.add_argument(
        "project_id",
        type=int,
        help="Numeric ID of the project"
    )
    args = parser.parse_args()

    project_id = args.project_id

    # Load token from .env
    token = load_env_token()

    # List deployments
    deployments = list_deployments(token, project_id)

    # Pretty print the results
    print(json.dumps(deployments, indent=2))


if __name__ == "__main__":
    main()
