#!/usr/bin/env python3
# /// script
# dependencies = ["python-dotenv"]
# ///
"""Deploy a project to Vercel production.

Reads VERCEL_TOKEN from .env file and runs vercel deploy with the token.

Usage:
    deploy.py <project_directory>

Example:
    deploy.py ./my-app
"""

import json
import subprocess
import sys
from pathlib import Path


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
    """Load VERCEL_TOKEN from .env file."""
    env_path = find_env_file()

    if not env_path:
        print("Error: .env file not found in current directory or parent directories", file=sys.stderr)
        print("Please create a .env file with VERCEL_TOKEN=your_token", file=sys.stderr)
        sys.exit(1)

    # Simple .env parser - reads line by line
    token = None
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line.startswith("VERCEL_TOKEN="):
                # Handle inline comments like "VERCEL_TOKEN=abc123 # comment"
                value = line.split("=", 1)[1].strip()
                # Split on whitespace or # to remove comments
                token = value.split()[0].split("#")[0].strip()
                # Remove quotes if present
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


def main():
    """Main entry point."""
    # Parse arguments
    if len(sys.argv) < 2:
        print("Usage: deploy.py <project_directory>", file=sys.stderr)
        print("", file=sys.stderr)
        print("Arguments:", file=sys.stderr)
        print("  project_directory   Path to the project to deploy", file=sys.stderr)
        print("", file=sys.stderr)
        print("Deploys the project to Vercel production.", file=sys.stderr)
        sys.exit(1)

    project_dir = Path(sys.argv[1]).resolve()

    if not project_dir.exists():
        print(f"Error: Directory not found: {project_dir}", file=sys.stderr)
        sys.exit(1)

    # Load token from .env
    token = load_env_token()

    # Run vercel deploy
    cmd = [
        "bunx", "vercel", "deploy",
        "--prod",
        "--yes",
        "--token", token
    ]

    try:
        result = subprocess.run(
            cmd,
            cwd=project_dir,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        # Print stdout (contains deployment URL and progress)
        if result.stdout:
            print(result.stdout)

        # Print stderr (contains build logs)
        if result.stderr:
            print(result.stderr, file=sys.stderr)

        if result.returncode != 0:
            sys.exit(result.returncode)

        # Try to extract deployment URL from output
        lines = result.stdout.strip().split("\n")
        deployment_url = None
        for line in lines:
            if line.startswith("https://") and "vercel.app" in line:
                deployment_url = line.strip()
                break

        # Output JSON summary
        output = {
            "status": "success",
            "projectDirectory": str(project_dir),
            "deploymentUrl": deployment_url
        }
        print(json.dumps(output, indent=2))

    except subprocess.TimeoutExpired:
        print("Error: Deployment timed out after 5 minutes", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError:
        print("Error: 'bunx' or 'vercel' not found. Make sure bun is installed.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error running vercel deploy: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
