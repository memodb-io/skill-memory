/**
 * Template generators for skill-memory
 */

/**
 * Generate a SKILL.md template for a new skill
 * Based on best practices from create-skill skill
 */
export function generateSkillTemplate(name: string): string {
  // Convert kebab-case to Title Case for display
  const displayName = name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return `---
name: ${name}
description: "[WHAT it does] + [WHEN to use it]. Example: Generate commit messages from git diffs. Use when the user asks for help writing commits or reviewing staged changes."
---

# ${displayName}

<!-- Keep SKILL.md under 500 lines. Use progressive disclosure for detailed content. -->

## Quick Start

<!-- Essential instructions go here. Be concise - the agent is already smart. -->

1. First step
2. Second step
3. Third step

## Examples

<!-- Concrete examples help the agent understand expected output format. -->

**Example 1:**
Input: [describe input]
Output:
\`\`\`
[expected output]
\`\`\`

## Additional Resources

<!-- Link to separate files for detailed documentation (keep references one level deep). -->

- For detailed reference, see [reference.md](reference.md)
- For more examples, see [examples.md](examples.md)
`;
}
