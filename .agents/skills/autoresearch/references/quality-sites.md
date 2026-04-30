# Quality Sites Whitelist

Vetted sources for non-API references: debugging, architecture patterns, system design, problem-solving, and general coding knowledge. **API/library documentation is always resolved by context7, never by these sites.**

## Context7 vs Quality Sites — Clear Split

| Query type | Resolver | Example |
|---|---|---|
| API signature, method docs, library usage | **context7 only** | "What params does asyncio.gather take?" |
| Error debugging, stack traces | quality-sites + context7 (API part) | "RuntimeError: event loop already running" |
| Architecture patterns, system design | quality-sites | "Event-driven vs message-driven architecture" |
| "How to build X" (non-API) | quality-sites | "How to design a rate limiter" |
| Library comparison, ecosystem | quality-sites | "FastAPI vs Flask in 2025" |
| New tech, emerging patterns | quality-sites | "What's new in distributed tracing" |
| Package version, release status | pypi.org / crates.io / npmjs.com directly | "Latest sqlalchemy version" |

---

## Tier 1 — Primary (always prefer)

High-signal sources for debugging, architecture, and real-world solutions.

| Domain | Covers | Notes |
|---|---|---|
| `stackoverflow.com` (score ≥ 5) | Debugging, problem-solving | Prefer answers with linked primary sources. Check answer date |
| `github.com` (issues, discussions, repo READMEs) | Bug reports, real-world solutions, architecture decisions | Prefer official org repos. Check issue resolution, stars, recent commits |
| `news.ycombinator.com` (high-karma threads) | Architecture debates, tech trends, postmortems | Use as discovery, not authority. Follow links to primary sources |
| `arxiv.org` (CS papers) | Algorithms, distributed systems, new architectures | Prefer papers with cited implementations or known authors |
| `martinfowler.com` | Architecture patterns, refactoring, microservices | Canonical for enterprise patterns |
| `highscalability.com` | System design, scaling stories | Real-world architecture case studies |
| Official engineering blogs | Deep dives, postmortems, architecture decisions | e.g., `netflixtechblog.com`, `engineering.fb.com`, `dropbox.tech`, `slack.engineering`, `blog.cloudflare.com` |

---

## Tier 2 — Secondary (high confidence, verify)

Good quality but not primary. Use when Tier 1 is insufficient.

| Domain | Covers | Notes |
|---|---|---|
| `medium.com` | Tutorials, architecture posts, opinion | Check author credentials + date. Skip paywalled |
| `dev.to` | Tutorials, discussion, how-to | Community posts, variable quality. Check author history |
| `freecodecamp.org/news` | Tutorials, explained concepts | Generally solid, but not primary |
| `blog.logrocket.com` | Frontend/backend tutorials | Decent quality, verify claims against primary sources |
| `digitalocean.com/community` | DevOps, Linux, deployment tutorials | Generally reliable, well-maintained |
| `lobste.rs` | Curated tech discussion | Higher signal than Reddit, smaller community |
| `kracekumar.com` / personal tech blogs | Deep dives, niche topics | Check if author is known in the field |
| `bytes.dev` / `pragmaticengineer.com` | Newsletter-style, industry trends | Good for ecosystem awareness, not primary |

---

## Tier 3 — Contextual (use as pointers only)

Flag as medium confidence. Never cite as sole authority.

| Domain | Covers | Notes |
|---|---|---|
| `reddit.com` (r/programming, r/rust, r/python, r/devops, etc.) | Discussion, problem-solving | Use ONLY to find primary sources. Never cite directly |
| `youtube.com` (conference talks, official channels) | Talks, tutorials | Prefer talks from recognized conferences (PyCon, RustConf, KubeCon, etc.) |
| `github.com/gist` | Code snippets, quick examples | No version guarantee. Read-only reference |
| `twitter.com` / `x.com` (known experts) | Quick takes, announcements | Verify before citing. Link to the actual source, not the tweet |

---

## Routing Rules

### When to use context7 (ALWAYS for API docs)

```
ctx7 library <name> <query>     # Step 1: resolve library ID
ctx7 docs <libraryId> <query>   # Step 2: fetch docs
```

**Use context7 for:**
- Function/method signatures and parameters
- Class hierarchies and inheritance
- Configuration options and defaults
- Any question answered by official library documentation
- Version-specific API changes

**NEVER use scrapling/quality-sites for:**
- Library/API documentation
- Language standard library references
- Framework configuration reference
- Package API specifications

### When to use quality-sites + scrapling

**Use for:**
- "Why am I getting this error?" → scrapling search + stackoverflow/github issues
- "What architecture should I use?" → martinfowler, highscalability, engineering blogs
- "How does X compare to Y?" → multiple Tier 1/2 sources, check dates
- "What's new in X ecosystem?" → HN, engineering blogs, conference talks
- "How did company Z solve problem W?" → engineering blogs, conference talks

### Hybrid queries (common)

Many queries span both domains. Split them:

```
Query: "asyncio.gather RuntimeError event loop already running"
→ context7: ctx7 docs python asyncio.gather (API reference)
→ quality-sites: scrapling search stackoverflow for the error (debugging)
→ Synthesize both findings
```

---

## Exclusions (do not cite)

- **API documentation sites**: docs.python.org, MDN, doc.rust-lang.org, golang.org/pkg, nodejs.org/docs, kubernetes.io/docs, docs.docker.com, react.dev, tailwindcss.com/docs, postgresql.org/docs, docs.rs, readthedocs.io — these are context7's domain
- **AI-generated content farms**: geeksforgeeks, w3schools (for non-web), tutorialspoint, javatpoint, programiz
- **Content scrapers/mirrors** that duplicate official docs or StackOverflow
- **Undated blog posts** or articles without author attribution
- **Package registries** used as information sources (use only for version/release checking)
- **LLM-generated tutorial sites** with no human author verification
- **Paywalled articles** on Medium or elsewhere
