#!/usr/bin/env python3
# /// script
# dependencies = ["python-dotenv"]
# ///
"""Create a new Convex project for a team.

Reads CONVEX_TOKEN from .env file in project root and calls the
Convex Management API to create a new project.
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
                return data["teamId"]
            elif "team_id" in data:
                return data["team_id"]
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


def create_project(token, team_id, project_name, deployment_type):
    """Create a new project for the team."""
    url = f"https://api.convex.dev/v1/teams/{team_id}/create_project"

    # Prepare request body
    body = {
        "projectName": project_name,
        "deploymentType": deployment_type
    }

    try:
        req = Request(url, method="POST")
        req.add_header("Authorization", f"Bearer {token}")
        req.add_header("Content-Type", "application/json")

        data = json.dumps(body).encode("utf-8")

        with urlopen(req, data=data, timeout=10) as response:
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
        print(f"Error creating project: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    """Main entry point."""
    # Parse arguments
    if len(sys.argv) < 2:
        print("Usage: create_project.py <project_name> [deployment_type]", file=sys.stderr)
        print("", file=sys.stderr)
        print("Arguments:", file=sys.stderr)
        print("  project_name      Name of the project to create", file=sys.stderr)
        print("  deployment_type   'dev' or 'prod' (default: dev)", file=sys.stderr)
        sys.exit(1)

    project_name = sys.argv[1]
    deployment_type = sys.argv[2] if len(sys.argv) > 2 else "dev"

    # Validate deployment type
    if deployment_type not in ["dev", "prod"]:
        print(f"Error: deployment_type must be 'dev' or 'prod', got '{deployment_type}'", file=sys.stderr)
        sys.exit(1)

    # Load token from .env
    token = load_env_token()

    # Get team ID from token
    team_id = extract_team_id_from_token(token)

    # Create project
    result = create_project(token, team_id, project_name, deployment_type)

    # Pretty print the results
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
