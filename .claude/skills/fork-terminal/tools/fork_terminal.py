#!/usr/bin/env -S uv run
"""Fork a new terminal window with a command."""

import os
import platform
import subprocess


def fork_terminal(command: str, terminal_type: str = "system") -> str:
    """Open a new terminal window and run the specified command.

    Args:
        command: The command to run in the new terminal.
        terminal_type: Type of terminal to open. Options:
            - "system": System default terminal (Terminal.app on macOS, cmd on Windows)
            - "vscode": VS Code integrated terminal
            - "cursor": Cursor integrated terminal
    """
    system = platform.system()
    cwd = os.getcwd()

    if system == "Darwin":  # macOS
        if terminal_type in ("vscode", "cursor"):
            return _open_ide_terminal_macos(command, cwd, terminal_type)
        else:
            return _open_system_terminal_macos(command, cwd)

    elif system == "Windows":
        if terminal_type in ("vscode", "cursor"):
            return _open_ide_terminal_windows(command, cwd, terminal_type)
        else:
            # Use /d flag to change drives if necessary
            full_command = f'cd /d "{cwd}" && {command}'
            subprocess.Popen(["cmd", "/c", "start", "cmd", "/k", full_command], shell=True)
            return "Windows terminal launched"

    else:  # Linux and others
        raise NotImplementedError(f"Platform {system} not supported")


def _open_system_terminal_macos(command: str, cwd: str) -> str:
    """Open macOS Terminal.app with the specified command."""
    shell_command = f"cd '{cwd}' && {command}"
    escaped_shell_command = shell_command.replace("\\", "\\\\").replace('"', '\\"')

    try:
        result = subprocess.run(
            ["osascript", "-e", f'tell application "Terminal" to do script "{escaped_shell_command}"'],
            capture_output=True,
            text=True,
        )
        output = f"stdout: {result.stdout.strip()}\nstderr: {result.stderr.strip()}\nreturn_code: {result.returncode}"
        return output
    except Exception as e:
        return f"Error: {str(e)}"


def _open_ide_terminal_macos(command: str, cwd: str, ide: str) -> str:
    """Open VS Code or Cursor integrated terminal via AppleScript keyboard simulation.

    Note: Requires accessibility permissions for System Events.
    """
    app_name = "Cursor" if ide == "cursor" else "Visual Studio Code"
    full_command = f"cd '{cwd}' && {command}"
    # Escape for AppleScript keystroke
    escaped_command = full_command.replace("\\", "\\\\").replace('"', '\\"')

    applescript = f'''
tell application "{app_name}" to activate
delay 0.3
tell application "System Events"
    -- Open new terminal with Ctrl+Shift+`
    keystroke "`" using {{control down, shift down}}
    delay 0.5
    -- Type the command
    keystroke "{escaped_command}"
    delay 0.1
    -- Press enter to execute
    keystroke return
end tell
'''

    try:
        result = subprocess.run(
            ["osascript", "-e", applescript],
            capture_output=True,
            text=True,
        )
        output = f"stdout: {result.stdout.strip()}\nstderr: {result.stderr.strip()}\nreturn_code: {result.returncode}"
        return output
    except Exception as e:
        return f"Error: {str(e)}"


def _open_ide_terminal_windows(command: str, cwd: str, ide: str) -> str:
    """Open VS Code or Cursor integrated terminal on Windows.

    Uses PowerShell to send keystrokes to the IDE.
    """
    app_name = "Cursor" if ide == "cursor" else "Code"
    full_command = f"cd '{cwd}' && {command}"
    # Escape for PowerShell
    escaped_command = full_command.replace("'", "''")

    powershell_script = f'''
Add-Type -AssemblyName System.Windows.Forms
$process = Get-Process -Name "{app_name}" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($process) {{
    [Microsoft.VisualBasic.Interaction]::AppActivate($process.Id)
    Start-Sleep -Milliseconds 300
    [System.Windows.Forms.SendKeys]::SendWait("^+``")
    Start-Sleep -Milliseconds 500
    [System.Windows.Forms.SendKeys]::SendWait("{escaped_command}")
    Start-Sleep -Milliseconds 100
    [System.Windows.Forms.SendKeys]::SendWait("{{ENTER}}")
}} else {{
    Write-Error "{app_name} is not running"
}}
'''

    try:
        result = subprocess.run(
            ["powershell", "-Command", powershell_script],
            capture_output=True,
            text=True,
        )
        output = f"stdout: {result.stdout.strip()}\nstderr: {result.stderr.strip()}\nreturn_code: {result.returncode}"
        return output
    except Exception as e:
        return f"Error: {str(e)}"


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Fork a new terminal window with a command.")
    parser.add_argument("command", nargs="*", help="Command to run in the new terminal")
    parser.add_argument(
        "-t", "--terminal",
        choices=["system", "vscode", "cursor"],
        default="system",
        help="Terminal type: system (default), vscode, or cursor"
    )
    args = parser.parse_args()

    if args.command:
        output = fork_terminal(" ".join(args.command), terminal_type=args.terminal)
        print(output)
    else:
        parser.print_help()
