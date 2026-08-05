#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""Create a new Next.js app with Convex assets and push to GitHub.

Creates directory, runs bun create next-app, copies Convex starter files,
initializes git, and creates a GitHub repository.
"""

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def run_command(cmd: list[str], cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess:
    """Run a command and optionally check for errors."""
    result = subprocess.run(cmd, cwd=cwd, capture_output=False)
    if check and result.returncode != 0:
        print(f"Error: Command failed: {' '.join(cmd)}", file=sys.stderr)
        sys.exit(1)
    return result


def main():
    parser = argparse.ArgumentParser(
        description="Create a new Next.js app with Convex assets and push to GitHub."
    )
    parser.add_argument(
        "app_name",
        help="Name of the app (lowercase, hyphens, numbers only)"
    )
    parser.add_argument(
        "--github-org",
        default="afk-agents",
        help="GitHub organization for the repository (default: afk-agents)"
    )
    parser.add_argument(
        "--base-dir",
        default=".",
        help="Base directory to create the app in (default: current directory)"
    )
    args = parser.parse_args()

    app_name = args.app_name
    github_org = args.github_org
    base_dir = Path(args.base_dir).resolve()
    app_dir = base_dir / app_name

    # Find the skill's assets directory (relative to this script)
    script_dir = Path(__file__).parent.resolve()
    assets_dir = script_dir.parent / "assets" / "convex"

    if not assets_dir.exists():
        print(f"Error: Assets directory not found at {assets_dir}", file=sys.stderr)
        sys.exit(1)

    # Step 1: Create app directory
    if app_dir.exists():
        print(f"Error: Directory {app_dir} already exists", file=sys.stderr)
        sys.exit(1)

    app_dir.mkdir(parents=True)
    print(f"Created directory: {app_dir}")

    # Step 2: Run bun create next-app
    print("Running bun create next-app...")
    run_command(
        ["bun", "create", "next-app@latest", ".", "--use-bun", "--typescript", "--yes"],
        cwd=app_dir
    )

    # Step 3: Copy Convex assets
    convex_dir = app_dir / "convex"
    convex_dir.mkdir(exist_ok=True)

    copied_files = []
    for src_file in assets_dir.iterdir():
        if src_file.is_file():
            dst_file = convex_dir / src_file.name
            shutil.copy2(src_file, dst_file)
            copied_files.append(src_file.name)

    print(f"Copied Convex assets: {', '.join(copied_files)}")

    # Step 4: Initialize git and push to GitHub
    print("Initializing git repository...")
    run_command(["git", "init"], cwd=app_dir)
    run_command(["git", "add", "."], cwd=app_dir)
    run_command(["git", "commit", "-m", "Initial commit: Next.js app with Convex"], cwd=app_dir)

    print(f"Creating GitHub repository: {github_org}/{app_name}...")
    run_command([
        "gh", "repo", "create", f"{github_org}/{app_name}",
        "--public", f"--source={app_dir}", "--remote=origin", "--push"
    ])

    print(f"\nApp created at: {app_dir}")
    print(f"GitHub repo: https://github.com/{github_org}/{app_name}")


if __name__ == "__main__":
    main()
