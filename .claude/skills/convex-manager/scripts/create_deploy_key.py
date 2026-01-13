#!/usr/bin/env python3
# /// script
# dependencies = ["python-dotenv"]
# ///
"""Create a deploy key for a Convex deployment.

Reads CONVEX_TOKEN from .env file in project root and calls the
Convex Management API to create a new deploy key for a deployment.
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


def create_deploy_key(token, deployment_name, key_name):
    """Create a deploy key for a deployment."""
    url = f"https://api.convex.dev/v1/deployments/{deployment_name}/create_deploy_key"

    # Prepare request body
    body = {
        "name": key_name
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
        print(f"Error creating deploy key: {e}", file=sys.stderr)
        sys.exit(1)


def main():
    """Main entry point."""
    # Parse arguments
    if len(sys.argv) < 3:
        print("Usage: create_deploy_key.py <deployment_name> <key_name>", file=sys.stderr)
        print("", file=sys.stderr)
        print("Arguments:", file=sys.stderr)
        print("  deployment_name   Name of the deployment (e.g., 'playful-otter-123')", file=sys.stderr)
        print("  key_name         Name for the deploy key", file=sys.stderr)
        print("", file=sys.stderr)
        print("Use list_deployments.py to find deployment names.", file=sys.stderr)
        sys.exit(1)

    deployment_name = sys.argv[1]
    key_name = sys.argv[2]

    # Load token from .env
    token = load_env_token()

    # Create deploy key
    result = create_deploy_key(token, deployment_name, key_name)

    # Pretty print the results
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
