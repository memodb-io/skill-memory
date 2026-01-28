---
name: skill-memory
description: Use skill-memory to download, view and edit agent skills in your memory. TRIGGER by (download skill to memory, find skills in memory, list skills in memory, view skill in memory, edit skill in memory)
---

## Setup
- assuem you have `skill-memory` cli, if not, run `npm install -g skill-memory`
- read `./recipe.md` to finish `skill-memory` setup.



## Available Commands

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

