<div align="center">
  <h1>skill-memory</h1>
  <p>
    one skill to rule them all.
  </p>
  <p>
    <a href="https://github.com/memodb-io/skill-memory/actions/workflows/ci.yml"><img src="https://github.com/memodb-io/skill-memory/actions/workflows/ci.yml/badge.svg"></a>
  </p>
</div>





`skill-memory` is a local store for your agent skills.

- It can download public skills, and maintain a forked version of it.
- You can edit, reuse and share many skills by only import one `skill-memory` skill.
- Use it as an agent memory consists with skills



## Installation

Add `skill-memory` skill to your agent:

```bash
npx skills add memodb-io/skill-memory
```

and type `setup skill-memory` in your agent.



## Quick Start

Read [SKILL.md](./skills/skill-memory/SKILL.md).



## Configuration

### Envs

| Variable            | Description                                         | Default           |
| ------------------- | --------------------------------------------------- | ----------------- |
| `SKILL_MEMORY_HOME` | Custom storage location for skills and cached repos | `~/.skill-memory` |
