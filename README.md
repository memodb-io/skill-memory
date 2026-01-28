# skill-memory

`skill-memory` is a global local store for your agent skills.

- It can download a public skill, and maintain a local version of it.
- You can change, reuse and share skills to other agents.



## Installation

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
```

Use skills

```bash
skill-memory view @xlsx/SKILL.md
skill-memory download @xlsx/recalc.py ./
skill-memory download @canvas-design/canvas-fonts ./
```

Edit skills in `skill-memory`

```bash
skill-memory upsert better-recalc.py @my-xlsx/recalc.py -m "add multi-sheets support"
```

