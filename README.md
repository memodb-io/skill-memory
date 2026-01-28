# skill-memory

`skill-memory` is a global local store for your agent skills.

- It can download a public skill, and maintain a local version of it.
- You can change, reuse and share skills to other agents.



## Installation

```bash
npm install -g skill-memory
```



## Quick Start

Add skills from remote to local:

```bash
# download from github
npx skill-memory remote list github.com@anthropic/skills
npx skill-memory remote add github.com@anthropic/skills@xlsx --rename my-xlsx
```

Use local skills

```bash
npx skill-memory list
npx skill-memory view 
npx skill-memory download @xlsx/recalc.py ./
npx skill-memory download @canvas-design/canvas-fonts ./
```

Edit local skills

```bash
npx skill-memory fork @xlsx my-xlsx
npx skill-memory upsert better-recalc.py @xlsx/recalc.py -m "add multi-sheets support"
```

