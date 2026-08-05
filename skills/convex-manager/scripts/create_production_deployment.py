#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Create a production deployment for an existing Convex project.

Reads CONVEX_TOKEN from .env file in project root and calls the
Convex API to provision a production deployment for a project.
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


def extract_team_id_from_token(token):
    """Extract team ID from the token by calling the token details endpoint."""
    url = "https://api.convex.dev/v1/token_details"

    try:
        req = Request(url)
        req.add_header("Authorization", f"Bearer {token}")

        with urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())

            # API returns camelCase teamId, not snake_case team_id
            if "teamId" in data:
                return data["teamId"], data.get("teamSlug")
            elif "team_id" in data:
                return data["team_id"], data.get("team_slug")
            else:
                print("Error: teamId not found in token details response", file=sys.stderr)
                print(f"Response: {json.dumps(data, indent=2)}", file=sys.stderr)
                sys.exit(1)

    except HTTPError as e:
        error_body = e.read().decode() if e.fp else "No error details"
        print(f"HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        print(f"Response: {error_body}", file=sys.stderr)
        sys.exit(1)
    except URLError as e:
        print(f"Network error: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error getting token details: {e}", file=sys.stderr)
        sys.exit(1)


def get_project_details(token, team_id, project_id):
    """Get project details including slug from the team's project list."""
    url = f"https://api.convex.dev/v1/teams/{team_id}/list_projects"

    try:
        req = Request(url)
        req.add_header("Authorization", f"Bearer {token}")

        with urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())

            # Find the project with matching ID
            for project in data:
                if project.get("id") == project_id:
                    return project

            print(f"Error: Project with ID {project_id} not found", file=sys.stderr)
            print("Use list_projects.py to find valid project IDs.", file=sys.stderr)
            sys.exit(1)

    except HTTPError as e:
        error_body = e.read().decode() if e.fp else "No error details"
        print(f"HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        print(f"Response: {error_body}", file=sys.stderr)
        sys.exit(1)
    except URLError as e:
        print(f"Network error: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error getting project details: {e}", file=sys.stderr)
        sys.exit(1)


def provision_production_deployment(token, team_slug, project_slug):
    """Provision a production deployment for the project."""
    url = "https://api.convex.dev/api/deployment/provision_and_authorize"

    # Prepare request body
    body = {
        "teamSlug": team_slug,
        "projectSlug": project_slug,
        "deploymentType": "prod"
    }

    try:
        req = Request(url, method="POST")
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Content-Type", "application/json")

        data = json.dumps(body).encode("utf-8")

        with urlopen(req, data=data, timeout=30) as response:
            result = json.loads(response.read().decode())
            return result

    except HTTPError as e:
        error_body = e.read().decode() if e.fp else "No error details"
        print(f"HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        print(f"Response: {error_body}", file=sys.stderr)
        sys.exit(1)
    except URLError as e:
        print(f"Network error: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error provisioning production deployment: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Create a production deployment for an existing Convex project.",
        epilog="Creates a production deployment for a project that currently only has a dev deployment."
    )
    parser.add_argument(
        "team_slug",
        help="Team slug (e.g., 'my-team')"
    )
    parser.add_argument(
        "project_id",
        type=int,
        help="Numeric ID of the project"
    )
    args = parser.parse_args()

    team_slug = args.team_slug
    project_id = args.project_id

    # Load token from .env
    token = load_env_token()

    # Get team ID from token (needed for project lookup)
    team_id, _ = extract_team_id_from_token(token)

    # Get project details
    project = get_project_details(token, team_id, project_id)
    project_slug = project.get("slug")
    project_name = project.get("name")

    if not project_slug:
        print("Error: Could not determine project slug", file=sys.stderr)
        sys.exit(1)

    # Provision production deployment
    result = provision_production_deployment(token, team_slug, project_slug)

    # Format output
    output = {
        "projectName": project_name,
        "projectSlug": project_slug,
        "deploymentName": result.get("deploymentName"),
        "deploymentUrl": result.get("url"),
        "status": "success"
    }

    # Pretty print the results
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
