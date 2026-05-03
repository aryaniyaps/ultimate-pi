![Ultimate PI banner](https://raw.githubusercontent.com/aryaniyaps/ultimate-pi/main/.github/banner-v2.png)

> The **ultimate AI coding harness** on top of [**pi.dev**](https://pi.dev).

## Goal

A production-grade coding harness where the agent:
1. Uses compressed context before raw tool spam,
2. Stays concise and deterministic in output style,
3. Is easy to extend with skills and extensions.

## Getting started

```bash
npm install -g ultimate-pi
```

From your project folder:

```bash
pi install ultimate-pi -l
```

Then reload PI:

```bash
/reload
```

Optional: install from GitHub Packages:

```bash
npm install -g @aryaniyaps/ultimate-pi --registry=https://npm.pkg.github.com
```

## Bootstrap

Run the harness setup prompt to configure everything (wiki, firecrawl, env vars, extensions):

```
/harness-setup
```

## Wiki

The harness includes an Obsidian wiki vault as its knowledge layer. Run `/wiki` in your PI session to scaffold it, then open the vault in [Obsidian](https://obsidian.md). Recommended community plugins: Dataview, Graph Analysis, Obsidian Git.

## Included skills

| Skill | What it does |
|---|---|
| **caveman** | Ultra-compressed response style (~75% token savings). |
| **context7-cli** | Fetch library docs, manage Context7 skills/config. |
| **find-skills** | Discover and install new agent skills. |
| **firecrawl** | Web search, scraping, crawling, JS rendering, interactive pages, structured extraction, site downloads. |
| **autoresearch** | Autonomous deep research filed to the wiki. |
| **wiki** | Scaffold and manage the Obsidian wiki vault. |
| **wiki-save** | Save conversations and insights to the wiki. |
| **wiki-query** | Answer questions using the wiki vault. |
| **wiki-ingest** | Distill external sources into wiki pages. |
| **wiki-lint** | Health-check the wiki (orphans, dead links, stale claims). |
| **wiki-fold** | Rollup log entries into meta-pages. |
| **defuddle** | Strip web page clutter to clean markdown. |
| **canvas** | Work with Obsidian JSON canvas files. |
| **obsidian-markdown** | Correct Obsidian-flavored markdown editing. |
| **obsidian-bases** | Create database-like views over vault notes. |
| **posthog-analyst** | Analyze agent performance via PostHog MCP. |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for local development setup, linting, and extension config details.
