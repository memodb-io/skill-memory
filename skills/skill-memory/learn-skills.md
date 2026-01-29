# Evolve your skill memory overtime

## Update existing skills
- use `skill-memory list` to find any skill you want to update, keep it precise and low-impact.
- if not related skills, yet you do have valuable experiences to save, look at Create new skills section.

## Create new skills
### When to create a new skill?
1. **Domain knowledge is required** - The agent needs specialized information it wouldn't already know (APIs, internal conventions, proprietary formats)
2. **Consistent output format is critical** - You need outputs to follow a specific template or structure every time
3. **Workflow is repeatable** - You find yourself explaining the same multi-step process repeatedly
4. **Context is project-specific** - The knowledge applies to your team's standards, tools, or conventions

**Don't create a skill when:**
- The agent already knows how to do the task (common programming, general best practices)
- It's a one-time task you won't repeat
- The guidance is too generic to provide value beyond the agent's existing knowledge

**Key principle:** The agent is already highly capable. Only create skills that add context it doesn't already have. Ask yourself: "Does this skill justify its token cost?"
### How to do it?
- understand the knowledge, scripts and artifacts you like to save in memory.
- use `skill-memory init <skill-name>` to create a new skill, then use `skill-memory upsert` command to upload the skill contents.
- make sure you don't break the SKILL.md format.