## Available Commands

### Add Skills to `skill-memory`
#### Add skills from Github
```bash
# download from github
skill-memory remote list github.com@anthropic/skills
skill-memory remote add github.com@anthropic/skills@xlsx --rename my-xlsx
```

#### Add skills from local
```bash
# link from local disk
skill-memory remote list localhost@/home/user/my-skill
skill-memory remote add localhost@./my-skill@xlsx --rename my-xlsx
```

### Skills in `skill-memory`
#### Manage skills
```bash
skill-memory list
skill-memory delete @xlsx
skill-memory copy @xlsx my-xlsx # @xlsx and @my-xlsx
skill-memory rename @xlsx my-xlsx # only @my-xlsx
skill-memory init @my-fool-skill # create a hello-world SKILL.md
```

#### Use skills
```bash
skill-memory view @xlsx/SKILL.md
skill-memory download @xlsx/recalc.py /tmp/
skill-memory download @canvas-design/canvas-fonts ./public/fonts/
skill-memory download @xlsx/ ./ # download entire skill
```

#### Edit skills
```bash
skill-memory upsert /tmp/better-recalc.py @my-xlsx/my_path/recalc.py -m "add multi-sheets support"
```

## Best Practices
- always use `skill-memory list` to list all your skills in memory first.
- always use `skill-memory view` to view `SKILL.md` first to understand a skill and its capabilities.
- for executable/binary files, use `skill-memory download` to download it to a local path and use them.