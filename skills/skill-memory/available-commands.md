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

#### Version control
```bash
skill-memory undo # undo the last command
skill-memory history # view command history
```
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
skill-memory delete @my-xlsx/my_path/recalc.py # delete a file from a skill
```



## Command Best Practices

Skills are modular, self-contained packages that extend Agent's capabilities by providing specialized knowledge, workflows, and tools. Think of them as "onboarding guides" for specific domains or tasks — they transform Agent from a general-purpose agent into a specialized agent equipped with procedural knowledge that no model can fully possess.

- always use `skill-memory list` to list all your skills in memory first.
- always use `skill-memory view` to view `SKILL.md` first to understand a skill and its capabilities.
- for executable/binary files, use `skill-memory download` to download it to a local path and use them.
- when create a new skill, upsert your SKILL.md to it right after you run `skill-memory init`
- when update a file of the skill, the correct way is to download it to a tmp path, use tools to edit it, then upsert them back with proper `-m` message.