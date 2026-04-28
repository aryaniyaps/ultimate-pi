# Git Setup

Initialize git in the vault to get full history and protect against bad writes.

---

## Initialize

```bash
cd "$VAULT_PATH"
git init
git add -A
git commit -m "Initial vault scaffold"
```

---

## .gitignore

The root `.gitignore` in this repo already covers the right exclusions:

```
.obsidian/workspace.json
.obsidian/workspace-mobile.json
.smart-connections/
.obsidian-git-data
.trash/
.DS_Store
```

`workspace.json` changes constantly as you move panes around. Excluding it keeps the diff clean.

---

## Obsidian Git Plugin

After installing the plugin (see `plugins.md`):

Settings > Obsidian Git:
- Auto backup interval: **15 minutes**
- Auto backup after file change: on
- Push on backup: on (if you have a remote)
- Commit message: `vault: auto backup {{date}}`

This runs silently in the background. You get a full history of every note without thinking about it.

---

## Remote (Optional)

To back up to GitHub:

```bash
git remote add origin https://github.com/yourname/your-vault
git push -u origin main
```

Keep the repo private if the vault contains personal notes.
