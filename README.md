<div align="center">
  <h1>skill-memory</h1>
  <p>
    one skill to rule them all.
  </p>
  <a href="https://github.com/memodb-io/skill-memory/actions/workflows/ci.yml"><img src="https://github.com/memodb-io/skill-memory/actions/workflows/ci.yml/badge.svg"></a>
</br>
</div>




`skill-memory` is a local store for your agent skills.

- It can download a public skill, and maintain a local version of it.
- You can change, reuse and share skills to other agents.
- It's a skill itself.

## Installation

Download cli:

```bash
npm install -g skill-memory
```



## Quick Start

Read [SKILL.md](./skills/skill-memory/SKILL.md).



## Configuration

### Envs

| Variable            | Description                                         | Default           |
| ------------------- | --------------------------------------------------- | ----------------- |
| `SKILL_MEMORY_HOME` | Custom storage location for skills and cached repos | `~/.skill-memory` |
