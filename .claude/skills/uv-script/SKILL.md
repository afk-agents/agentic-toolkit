---
name: uv-script
description: Create and run Python scripts with uv self-contained script format (PEP 723). Use when creating standalone Python scripts with dependencies, managing script dependencies inline, or running Python scripts with uv.
---

# UV Self-Contained Scripts

Create Python scripts with inline dependency declarations using the PEP 723 format. Dependencies are managed directly in the script file, making scripts portable and reproducible.

## Creating a new script

Initialize a script with inline metadata:

```bash
uv init --script example.py --python 3.12
```

This creates a script with PEP 723 metadata block at the top.

## Adding dependencies

Add dependencies directly to the script:

```bash
uv add --script example.py 'requests<3' 'rich'
```

This adds dependencies to the inline metadata:

```python
# /// script
# dependencies = [
#   "requests<3",
#   "rich",
# ]
# ///
```

## Running scripts

Execute with `uv run`:

```bash
uv run example.py
```

Pass arguments normally:

```bash
uv run example.py arg1 arg2
```

For temporary dependencies without modifying the script:

```bash
uv run --with rich example.py
```

## Python version requirements

Specify Python version in the metadata:

```python
# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///
```

Or request at runtime:

```bash
uv run --python 3.10 example.py
```

## Making scripts executable

Add shebang to make scripts standalone:

```python
#!/usr/bin/env -S uv run --script
# /// script
# dependencies = ["requests"]
# ///

import requests
# ... rest of script
```

Then make executable:

```bash
chmod +x script.py
./script.py
```

## Locking dependencies

Lock dependencies for reproducibility:

```bash
uv lock --script example.py
```

Creates an adjacent `.lock` file that ensures consistent dependency versions across runs.

## Important notes

**Project isolation**: When using inline script metadata, project dependencies are ignored even if run within a project directory. The script's dependencies take precedence.

**GUI scripts on Windows**: Use `.pyw` extension for GUI scripts that should run with `pythonw`:

```bash
uv run example.pyw
```

**Custom package indexes**: Specify alternative indexes when adding dependencies:

```bash
uv add --index "https://example.com/simple" --script example.py 'package'
```

**Reproducibility**: Add `exclude-newer` to limit package versions by date:

```python
# /// script
# dependencies = ["requests"]
#
# [tool.uv]
# exclude-newer = "2023-10-16T00:00:00Z"
# ///
```

## Workflow

1. Initialize script: `uv init --script name.py`
2. Add dependencies: `uv add --script name.py 'package'`
3. Write your code
4. Run: `uv run name.py`
5. (Optional) Lock: `uv lock --script name.py` for reproducibility
6. (Optional) Add shebang and `chmod +x` to make executable
