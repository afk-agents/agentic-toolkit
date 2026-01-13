#!/usr/bin/env python3
# /// script
# dependencies = ["python-dotenv"]
# ///
"""Delete a Convex project.

Reads CONVEX_TOKEN from .env file in project root and calls the
Convex Management API to delete a project and all its deployments.
"""

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


def delete_project(token, project_id):
    """Delete a project and all its deployments."""
    url = f"https://api.convex.dev/v1/projects/{project_id}/delete"

    try:
        req = Request(url, method="POST")
        req.add_header("Authorization", f"Bearer {token}")

        with urlopen(req, timeout=10) as response:
            # API returns empty response on success
            if response.status == 200:
                return {"status": "success", "message": f"Project {project_id} deleted"}
            else:
                return {"status": "unknown", "code": response.status}

    except HTTPError as e:
        error_body = e.read().decode() if e.fp else "No error details"
        print(f"HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        print(f"Response: {error_body}", file=sys.stderr)
        sys.exit(1)
    except URLError as e:
        print(f"Network error: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error deleting project: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    """Main entry point."""
    # Parse arguments
    if len(sys.argv) < 2:
        print("Usage: delete_project.py <project_id>", file=sys.stderr)
        print("", file=sys.stderr)
        print("Arguments:", file=sys.stderr)
        print("  project_id   Numeric ID of the project to delete", file=sys.stderr)
        print("", file=sys.stderr)
        print("WARNING: This will delete the project and ALL its deployments!", file=sys.stderr)
        print("Use list_projects.py to find project IDs.", file=sys.stderr)
        sys.exit(1)

    try:
        project_id = int(sys.argv[1])
    except ValueError:
        print(f"Error: project_id must be a number, got '{sys.argv[1]}'", file=sys.stderr)
        sys.exit(1)

    # Load token from .env
    token = load_env_token()

    # Delete project
    result = delete_project(token, project_id)

    # Pretty print the results
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
