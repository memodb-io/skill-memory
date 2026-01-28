/**
 * Template generators for skill-memory
 */

/**
 * Generate a SKILL.md template for a new skill
 */
export function generateSkillTemplate(name: string): string {
  // Convert kebab-case to Title Case for display
  const displayName = name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return `---
name: ${name}
description: A brief description of what this skill does
---

# ${displayName}

Instructions for the AI assistant on how to use this skill.

## When to Use

- Use case 1
- Use case 2

## How to Use

1. Step one
2. Step two
`;
}
