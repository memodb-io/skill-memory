<div align="center">
  <h1>skill-memory</h1>
  <p>
    one skill to rule them all.
  </p>
  <a href="https://github.com/memodb-io/skill-memory/actions/workflows/ci.yml"><img src="https://github.com/memodb-io/skill-memory/actions/workflows/ci.yml/badge.svg"></a>
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

### Add Skills to `skill-memory`

Add skills from Github:

```bash
# download from github
skill-memory remote list github.com@anthropic/skills
skill-memory remote add github.com@anthropic/skills@xlsx --rename my-xlsx
```

Add skills from local:
```bash
# download from github
skill-memory remote list localhost@/home/user/my-skill
skill-memory remote add localhost@./my-skill@xlsx --rename my-xlsx
```



### Skills in `skill-memory`

Manage skills:

```bash
skill-memory list
skill-memory delete @xlsx
skill-memory copy @xlsx my-xlsx # @xlsx and @my-xlsx
skill-memory rename @xlsx my-xlsx # only @my-xlsx
skill-memory init @my-fool-skill # create a hello-world SKILL.md
```

Use skills

```bash
skill-memory view @xlsx/SKILL.md
skill-memory download @xlsx/recalc.py ./
skill-memory download @canvas-design/canvas-fonts ./
```

Edit skills in `skill-memory`

```bash
skill-memory upsert better-recalc.py @my-xlsx/my_path/recalc.py -m "add multi-sheets support"
```





## Configuration

### Envs

| Variable            | Description                                         | Default           |
| ------------------- | --------------------------------------------------- | ----------------- |
| `SKILL_MEMORY_HOME` | Custom storage location for skills and cached repos | `~/.skill-memory` |
