# skill-memory

`skill-memory` is a global local store for your agent skills.

- It can download a public skill, and maintain a local version of it.
- You can change, reuse and share skills to other agents.



## Installation

```bash
npm install -g skill-memory
```



## Quick Start

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
skill-memory remote add localhost@/home/user/my-skill@xlsx --rename my-xlsx
```

Use skills in `skill-memory`
```bash
skill-memory list
skill-memory view @xlsx/SKILL.md
skill-memory delete @xlsx
skill-memory download @xlsx/recalc.py ./
skill-memory download @canvas-design/canvas-fonts ./
```

Edit skills in `skill-memory`

```bash
skill-memory fork @xlsx my-xlsx
skill-memory upsert better-recalc.py @xlsx/recalc.py -m "add multi-sheets support"
```

