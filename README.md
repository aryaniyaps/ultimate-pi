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


## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for local development setup, linting, and extension config details.
