---
name: create-skill
description: Guide for creating effective Agent Skills in Claude Code. Use when the user wants to create a new skill, improve an existing skill, or learn about skill authoring best practices.
---

# Creating Agent Skills

This skill teaches you how to create effective Agent Skills for Claude Code.

## Required Reading

Before creating a skill, you MUST read these two documents to understand the skill system:

1. **Skills Documentation**: https://code.claude.com/docs/en/skills.md
   - Covers skill structure, configuration, and how skills work
   - Read with prompt: "Extract all information about creating and structuring skills"

2. **Best Practices Guide**: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices.md
   - Covers authoring guidelines, patterns, and anti-patterns
   - Read with prompt: "Extract all best practices for creating agent skills"

Use the WebFetch tool to read both documents before proceeding.

## Skill Creation Workflow

Copy this checklist and track your progress:

```
Skill Creation Progress:
- [ ] Step 1: Read required documentation (both URLs above)
- [ ] Step 2: Understand the use case and gather requirements
- [ ] Step 3: Design the skill structure
- [ ] Step 4: Write SKILL.md with frontmatter and instructions
- [ ] Step 5: Add supporting files if needed
- [ ] Step 6: Validate against checklist
```

### Step 1: Read Required Documentation

Use WebFetch to read both documentation URLs listed above. This ensures you have current information about skill structure and best practices.

### Step 2: Understand the Use Case

Work with the user to clarify:
- **What does the skill do?** (specific capabilities)
- **When should it activate?** (trigger keywords and contexts)
- **What context does Claude need?** (domain knowledge, procedures, preferences)
- **What tools are involved?** (scripts, MCP tools, file operations)

### Step 3: Design the Skill Structure

Determine the appropriate structure:

**Simple skill** (single SKILL.md file):
- Brief instructions (under 500 lines)
- No complex workflows
- Minimal reference material

**Multi-file skill** (progressive disclosure):
```
skill-name/
├── SKILL.md              # Overview and navigation
├── reference.md          # Detailed documentation (loaded as needed)
├── examples.md           # Usage examples (loaded as needed)
└── scripts/              # Utility scripts (executed, not loaded)
    └── helper.py
```

### Step 4: Write SKILL.md

Create the skill file with two parts:

#### Part 1: YAML Frontmatter

```yaml
---
name: skill-name
description: What it does and when to use it (max 1024 chars)
---
```

**Name requirements**:
- Lowercase letters, numbers, hyphens only
- Max 64 characters
- Use gerund form: `processing-pdfs`, `analyzing-data`, `managing-databases`

**Description requirements**:
- Be specific with key terms
- Include WHAT it does and WHEN to use it
- Third person only (not "I can help" or "You can use")
- Include trigger keywords users would say

**Good description example**:
```yaml
description: Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

#### Part 2: Markdown Instructions

Follow these guidelines:

**Be concise**:
- Assume Claude is smart and knows common concepts
- Only add context Claude doesn't already have
- Challenge each paragraph: "Does this justify its token cost?"

**Provide clear workflows for complex tasks**:
```markdown
## Workflow

Copy this checklist and track progress:

\`\`\`
Task Progress:
- [ ] Step 1: Analyze input
- [ ] Step 2: Process data
- [ ] Step 3: Validate output
\`\`\`

**Step 1: Analyze input**
[Clear instructions...]

**Step 2: Process data**
[Clear instructions...]
```

**Use examples for output quality**:
````markdown
## Output Format

**Example 1:**
Input: [concrete input]
Output:
```
[concrete output]
```

**Example 2:**
Input: [concrete input]
Output:
```
[concrete output]
```
````

**Progressive disclosure for large content**:
```markdown
## Quick Start
[Essential instructions here]

## Advanced Features
- **Form filling**: See [FORMS.md](FORMS.md)
- **API reference**: See [REFERENCE.md](REFERENCE.md)
- **Examples**: See [EXAMPLES.md](EXAMPLES.md)
```

**Implement feedback loops for quality-critical tasks**:
```markdown
## Process

1. Perform operation
2. Run validator: `python scripts/validate.py output.json`
3. If validation fails:
   - Review error messages
   - Fix issues
   - Run validator again
4. Only proceed when validation passes
```

### Step 5: Add Supporting Files (If Needed)

**When to use supporting files**:
- SKILL.md exceeds 500 lines
- Multiple domains need separation
- Complex reference material
- Utility scripts for reliability

**Organize effectively**:
- Link directly from SKILL.md (keep references one level deep)
- Use descriptive filenames: `form_validation_rules.md` not `doc2.md`
- Use forward slashes: `reference/guide.md` not `reference\guide.md`
- Group by domain: `reference/finance.md`, `reference/sales.md`

**Include table of contents in longer files** (>100 lines):
```markdown
# API Reference

## Contents
- Authentication and setup
- Core methods
- Advanced features
- Error handling
- Examples

## Authentication and setup
...
```

**Bundle utility scripts**:
- Scripts are executed, not loaded into context
- Saves tokens and ensures reliability
- Make execution intent clear: "Run `analyze.py` to extract fields"

### Step 6: Validate Against Checklist

Use this checklist before considering the skill complete:

#### Core Quality
- [ ] Description is specific with key terms
- [ ] Description includes both WHAT and WHEN
- [ ] Description uses third person (not "I" or "you")
- [ ] SKILL.md body is under 500 lines
- [ ] No time-sensitive information
- [ ] Consistent terminology throughout
- [ ] Concrete examples, not abstract
- [ ] File references one level deep
- [ ] Workflows have clear steps

#### Structure
- [ ] YAML frontmatter is valid
- [ ] Name follows conventions (lowercase, hyphens, gerund form)
- [ ] Supporting files use forward slashes
- [ ] Long reference files have table of contents
- [ ] Progressive disclosure used appropriately

#### Scripts and Code (if applicable)
- [ ] Scripts handle errors explicitly
- [ ] No "magic numbers" (all values justified)
- [ ] Required packages listed and verified
- [ ] Clear documentation for each script
- [ ] Validation steps for critical operations

## Key Best Practices

### Do This
✓ Be concise - assume Claude is smart
✓ Use gerund form for names: `processing-pdfs`, `analyzing-data`
✓ Include specific trigger keywords in description
✓ Provide concrete examples for output quality
✓ Use progressive disclosure for large content
✓ Add feedback loops for quality-critical tasks
✓ Use forward slashes in all paths
✓ Bundle utility scripts for reliability
✓ Test with real usage and iterate

### Avoid This
✗ Verbose explanations of obvious concepts
✗ Windows-style paths (backslashes)
✗ Time-sensitive information
✗ Vague descriptions like "Helps with documents"
✗ Inconsistent terminology
✗ Deeply nested file references (keep one level deep)
✗ Offering too many options without a default
✗ First or second person in descriptions

## Common Patterns

### Template Pattern (for strict requirements)
````markdown
## Output Structure

ALWAYS use this exact template:

\`\`\`markdown
# [Title]

## Section 1
[Content]

## Section 2
[Content]
\`\`\`
````

### Conditional Workflow Pattern
```markdown
## Workflow

1. Determine task type:

   **Creating new content?** → Follow "Creation workflow"
   **Editing existing content?** → Follow "Editing workflow"

2. Creation workflow:
   [Steps...]

3. Editing workflow:
   [Steps...]
```

### Examples Pattern (for output quality)
````markdown
## Format

Follow these examples:

**Example 1:**
Input: [specific input]
Output:
\`\`\`
[specific output]
\`\`\`

**Example 2:**
Input: [specific input]
Output:
\`\`\`
[specific output]
\`\`\`
````

## Testing and Iteration

After creating the skill:

1. **Test with Claude**: Use a fresh conversation with the skill loaded
2. **Observe behavior**: Note where Claude struggles or succeeds
3. **Iterate**: Refine based on actual usage, not assumptions
4. **Get feedback**: Have others test and provide input

## Advanced Configuration (Optional)

### Restrict Tools
```yaml
allowed-tools: Read, Grep, Glob
```

### Run in Forked Context
```yaml
context: fork
agent: general-purpose
```

### Add Hooks
```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/check.sh"
          once: true
```

### Control Visibility
```yaml
user-invocable: false  # Hide from slash menu, allow programmatic use
```

## File Location

Save skills in one of these locations:

| Location | Path | Scope |
|----------|------|-------|
| Personal | `~/.claude/skills/skill-name/` | You, across all projects |
| Project | `.claude/skills/skill-name/` | Anyone in this repository |
| Plugin | `skills/skill-name/` in plugin | Anyone with plugin installed |

## Need Help?

If you encounter issues:
1. Verify YAML frontmatter is valid (no tabs, starts with `---` on line 1)
2. Check file paths use forward slashes
3. Ensure SKILL.md exists with exact capitalization
4. Run `claude --debug` to see loading errors
5. Ask "What Skills are available?" to verify loading

## Summary

Creating effective skills:
1. Read the required documentation first
2. Design for conciseness - assume Claude is smart
3. Write specific descriptions with trigger keywords
4. Use progressive disclosure for large content
5. Provide concrete examples for output quality
6. Test with real usage and iterate
7. Follow the validation checklist before sharing
