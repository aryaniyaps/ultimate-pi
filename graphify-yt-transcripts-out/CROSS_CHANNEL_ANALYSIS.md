# Cross-channel link analysis

Across **9 channels** with non-empty content (out of 24 in the corpus), the graph captures concepts that appear in multiple channels and the edges that span them.

- Total canonical concept nodes: **5426**
- Multi-channel concept nodes (appear in ≥2 channels): **75**
- Cross-channel-ish edges (endpoints span channels): **1441**

## Channels (by node attribution count)

| Channel | Distinct concepts |
|---|---:|
| indydevdan | 2506 |
| boundaryml | 2030 |
| cole-medin | 848 |
| mlops | 36 |
| latentspacepod | 27 |
| jaymin-west | 21 |
| mastra-ai | 18 |
| baururazalinov | 17 |
| nicksaraev | 16 |

## Shared concepts that bridge channels

Canonical nodes that appear in transcripts from ≥2 different channels — these are the conceptual anchors that link channels into one shared discourse.

| Rank | Concept | # channels | Channels | Alias count |
|---:|---|---:|---|---:|
| 1 | **Claude Code** | 5 | boundaryml, cole-medin, indydevdan, jaymin-west, mlops | 34 |
| 2 | **Cursor** | 4 | baururazalinov, boundaryml, cole-medin, indydevdan | 12 |
| 3 | **Anthropic** | 3 | boundaryml, cole-medin, indydevdan | 12 |
| 4 | **Context Engineering** | 3 | baururazalinov, boundaryml, cole-medin | 9 |
| 5 | **LangGraph** | 3 | boundaryml, cole-medin, indydevdan | 6 |
| 6 | **OpenAI** | 3 | boundaryml, cole-medin, indydevdan | 6 |
| 7 | **LangChain** | 3 | boundaryml, cole-medin, indydevdan | 5 |
| 8 | **Claude Agent Sdk** | 3 | boundaryml, cole-medin, indydevdan | 5 |
| 9 | **Human-in-the-loop** | 3 | boundaryml, cole-medin, indydevdan | 4 |
| 10 | **Andrej Karpathy** | 3 | boundaryml, cole-medin, nicksaraev | 4 |
| 11 | **Vibe Coding** | 3 | boundaryml, cole-medin, indydevdan | 4 |
| 12 | **Harness Engineering** | 3 | baururazalinov, boundaryml, indydevdan | 3 |
| 13 | **scripts/index_youtube_urls.py** | 3 | boundaryml, cole-medin, indydevdan | 3 |
| 14 | **Generative UI** | 3 | boundaryml, cole-medin, indydevdan | 3 |
| 15 | **OpenRouter** | 3 | boundaryml, cole-medin, indydevdan | 3 |
| 16 | **Cursor IDE** | 2 | boundaryml, indydevdan | 11 |
| 17 | **Pi coding agent** | 2 | cole-medin, indydevdan | 7 |
| 18 | **GPT-4o mini** | 2 | boundaryml, indydevdan | 5 |
| 19 | **Model Context Protocol (MCP)** | 2 | boundaryml, cole-medin | 5 |
| 20 | **Agent skills** | 2 | boundaryml, indydevdan | 5 |
| 21 | **Ollama** | 2 | cole-medin, indydevdan | 5 |
| 22 | **Sub-agents** | 2 | cole-medin, indydevdan | 5 |
| 23 | **Bun runtime** | 2 | cole-medin, indydevdan | 5 |
| 24 | **Claude Sonnet 4.5** | 2 | cole-medin, indydevdan | 4 |
| 25 | **Agentic engineering** | 2 | cole-medin, indydevdan | 4 |
| 26 | **Codex** | 2 | cole-medin, indydevdan | 4 |
| 27 | **Transcript unavailable** | 2 | cole-medin, indydevdan | 4 |
| 28 | **GPT-4o** | 2 | boundaryml, indydevdan | 3 |
| 29 | **TypeScript** | 2 | boundaryml, indydevdan | 3 |
| 30 | **Vibe coding critique** | 2 | boundaryml, indydevdan | 3 |
| 31 | **Uv Run** | 2 | boundaryml, indydevdan | 3 |
| 32 | **Playwright Mcp** | 2 | boundaryml, cole-medin | 3 |
| 33 | **Agents Md** | 2 | boundaryml, cole-medin | 3 |
| 34 | **MCP (Model Context Protocol)** | 2 | boundaryml, cole-medin | 3 |
| 35 | **OpenClaw** | 2 | cole-medin, indydevdan | 3 |
| 36 | **IndyDevDan** | 2 | cole-medin, indydevdan | 3 |
| 37 | **Firecrawl** | 2 | cole-medin, indydevdan | 3 |
| 38 | **Python** | 2 | cole-medin, indydevdan | 3 |
| 39 | **Claude Haiku 4.5** | 2 | cole-medin, indydevdan | 3 |
| 40 | **Prime Command** | 2 | cole-medin, indydevdan | 3 |
| 41 | **settings.json hooks** | 2 | cole-medin, indydevdan | 3 |
| 42 | **Ask user question tool** | 2 | cole-medin, indydevdan | 3 |
| 43 | **Poetry (Python packaging)** | 2 | boundaryml, indydevdan | 2 |
| 44 | **VS Code** | 2 | boundaryml, indydevdan | 2 |
| 45 | **Anthropic Computer Use** | 2 | boundaryml, indydevdan | 2 |
| 46 | **Claude Desktop** | 2 | boundaryml, cole-medin | 2 |
| 47 | **ollama local** | 2 | boundaryml, indydevdan | 2 |
| 48 | **RAG** | 2 | boundaryml, cole-medin | 2 |
| 49 | **React** | 2 | boundaryml, cole-medin | 2 |
| 50 | **FastAPI** | 2 | boundaryml, cole-medin | 2 |

## Channel-pair overlap (top 30 channel pairs by shared concepts)

| Channel A | Channel B | Shared concepts | Examples |
|---|---|---:|---|
| cole-medin | indydevdan | 45 | Anthropic, Bun runtime, Codex, Sub-agents, Transcript unavailable |
| boundaryml | indydevdan | 26 | Anthropic, Claude Agent Sdk, Cursor, Poetry (Python packaging), Uv Run |
| boundaryml | cole-medin | 23 | Anthropic, Claude Agent Sdk, Cursor, MCP (Model Context Protocol), React |
| baururazalinov | boundaryml | 3 | Context Engineering, Cursor, Harness Engineering |
| baururazalinov | cole-medin | 2 | Context Engineering, Cursor |
| baururazalinov | indydevdan | 2 | Cursor, Harness Engineering |
| boundaryml | jaymin-west | 2 | Claude Code, Pre Commit Hooks |
| boundaryml | mlops | 2 | Claude Code, Research–Plan–Implement (RPI) |
| indydevdan | nicksaraev | 2 | Google Antigravity IDE, Opus 4.6 |
| boundaryml | nicksaraev | 1 | Andrej Karpathy |
| cole-medin | jaymin-west | 1 | Claude Code |
| cole-medin | latentspacepod | 1 | Latent Space (podcast) |
| cole-medin | mlops | 1 | Claude Code |
| cole-medin | nicksaraev | 1 | Andrej Karpathy |
| indydevdan | jaymin-west | 1 | Claude Code |
| indydevdan | mlops | 1 | Claude Code |
| jaymin-west | mlops | 1 | Claude Code |

## High-betweenness multi-channel bridges (top 25)

Bridge concepts: high betweenness centrality *and* attested in ≥2 channels.

| Rank | Concept | Betweenness | Degree | Channels |
|---:|---|---:|---:|---|
| 1 | **Claude Code** | 0.5371 | 549 | boundaryml, cole-medin, indydevdan, jaymin-west, mlops |
| 2 | **Context Engineering** | 0.1737 | 71 | baururazalinov, boundaryml, cole-medin |
| 3 | **Cursor** | 0.1022 | 65 | baururazalinov, boundaryml, cole-medin, indydevdan |
| 4 | **OpenRouter** | 0.0986 | 19 | boundaryml, cole-medin, indydevdan |
| 5 | **Cursor IDE** | 0.0570 | 28 | boundaryml, indydevdan |
| 6 | **Playwright Mcp** | 0.0479 | 6 | boundaryml, cole-medin |
| 7 | **Pi coding agent** | 0.0399 | 33 | cole-medin, indydevdan |
| 8 | **Harness Engineering** | 0.0395 | 13 | baururazalinov, boundaryml, indydevdan |
| 9 | **Agent skills** | 0.0360 | 27 | boundaryml, indydevdan |
| 10 | **Anthropic** | 0.0318 | 24 | boundaryml, cole-medin, indydevdan |
| 11 | **LangGraph** | 0.0312 | 13 | boundaryml, cole-medin, indydevdan |
| 12 | **OpenAI** | 0.0299 | 23 | boundaryml, cole-medin, indydevdan |
| 13 | **Ollama** | 0.0266 | 26 | cole-medin, indydevdan |
| 14 | **ollama local** | 0.0262 | 5 | boundaryml, indydevdan |
| 15 | **LangChain** | 0.0225 | 8 | boundaryml, cole-medin, indydevdan |
| 16 | **Model Context Protocol (MCP)** | 0.0219 | 20 | boundaryml, cole-medin |
| 17 | **Bun runtime** | 0.0216 | 11 | cole-medin, indydevdan |
| 18 | **Prime Command** | 0.0203 | 5 | cole-medin, indydevdan |
| 19 | **Andrej Karpathy** | 0.0179 | 21 | boundaryml, cole-medin, nicksaraev |
| 20 | **Agentic engineering** | 0.0168 | 8 | cole-medin, indydevdan |
| 21 | **Vibe coding critique** | 0.0164 | 7 | boundaryml, indydevdan |
| 22 | **Human-in-the-loop checkpoints** | 0.0161 | 5 | boundaryml, indydevdan |
| 23 | **GPT-4o** | 0.0158 | 11 | boundaryml, indydevdan |
| 24 | **GitHub Actions** | 0.0143 | 15 | boundaryml, cole-medin |
| 25 | **MCP (Model Context Protocol)** | 0.0129 | 20 | boundaryml, cole-medin |

## Top cross-channel edges (by weight)

Edges whose endpoints have disjoint channel attributions — explicit cross-channel links.

| # | Source | -> Relation -> | Target | Src channels | Tgt channels |
|---:|---|---|---|---|---|
| 1 | Cursor | semantically_similar_to | Claude Code | baururazalinov, boundaryml, cole-medin, indydevdan | boundaryml, cole-medin, indydevdan, jaymin-west, mlops |
| 2 | Pi coding agent | semantically_similar_to | Claude Code | cole-medin, indydevdan | boundaryml, cole-medin, indydevdan, jaymin-west, mlops |
| 3 | VS Code | semantically_similar_to | Cursor | boundaryml, indydevdan | baururazalinov, boundaryml, cole-medin, indydevdan |
| 4 | GPT-4o mini | references | OpenAI | boundaryml, indydevdan | boundaryml, cole-medin, indydevdan |
| 5 | Agents Md | shares_data_with | Codex | boundaryml, cole-medin | cole-medin, indydevdan |
| 6 | Codex | references | Agents Md | cole-medin, indydevdan | boundaryml, cole-medin |
| 7 | Cursor | references | Agents Md | baururazalinov, boundaryml, cole-medin, indydevdan | boundaryml, cole-medin |
| 8 | Windsurf | semantically_similar_to | Cursor | cole-medin, indydevdan | baururazalinov, boundaryml, cole-medin, indydevdan |
| 9 | Agent skills | conceptually_related_to | Sub-agents | boundaryml, indydevdan | cole-medin, indydevdan |
| 10 | Cursor IDE | references | Claude Code | boundaryml, indydevdan | boundaryml, cole-medin, indydevdan, jaymin-west, mlops |
| 11 | Pi coding agent | semantically_similar_to | Pi coding agent harness | cole-medin, indydevdan | indydevdan |
| 12 | Aider | conceptually_related_to | Cursor | indydevdan | baururazalinov, boundaryml, cole-medin, indydevdan |
| 13 | Level 2: Agent IDE | references | Cursor | baururazalinov | baururazalinov, boundaryml, cole-medin, indydevdan |
| 14 | Level 2: Agent IDE | conceptually_related_to | Context Engineering | baururazalinov | baururazalinov, boundaryml, cole-medin |
| 15 | Context Engineering | conceptually_related_to | Compounding Engineering | baururazalinov, boundaryml, cole-medin | baururazalinov |
| 16 | Agent Skills (tool use) | conceptually_related_to | Harness Engineering | baururazalinov | baururazalinov, boundaryml, indydevdan |
| 17 | Harness Engineering | references | Back Pressure (types, tests, linters, hooks) | baururazalinov, boundaryml, indydevdan | baururazalinov |
| 18 | Harness Engineering | conceptually_related_to | Background Agents | baururazalinov, boundaryml, indydevdan | baururazalinov |
| 19 | Context Engineering | semantically_similar_to | Boundaryml 2024 09 16 Mitj2Ukpb-S Structured Prompting Rigor | baururazalinov, boundaryml, cole-medin | boundaryml |
| 20 | Harness Engineering | semantically_similar_to | BAML | baururazalinov, boundaryml, indydevdan | boundaryml |
| 21 | extract_resume BAML function | references | Baururazalinov 2026 03 30 9F4B3Xzjjkq Openai | boundaryml | baururazalinov |
| 22 | Baururazalinov 2026 03 30 9F4B3Xzjjkq Openai | references | GPT-4o mini | baururazalinov | boundaryml, indydevdan |
| 23 | ctx.output_format (schema in prompt) | semantically_similar_to | Context Engineering | boundaryml | baururazalinov, boundaryml, cole-medin |
| 24 | Programmatic cross-field validation | semantically_similar_to | Harness Engineering | boundaryml | baururazalinov, boundaryml, indydevdan |
| 25 | Sherlock AI (trading copilot) | references | LangGraph | boundaryml | boundaryml, cole-medin, indydevdan |
| 26 | Agent as nested while loops / switch on actions | semantically_similar_to | Baururazalinov 2026 03 30 9F4B3Xzjjkq Agent As While Loop | boundaryml | baururazalinov |
| 27 | Cursor for demos | references | Cursor | boundaryml | baururazalinov, boundaryml, cole-medin, indydevdan |
| 28 | OpenAI strict structured outputs risks | references | Baururazalinov 2026 03 30 9F4B3Xzjjkq Openai | boundaryml | baururazalinov |
| 29 | JSON Schema token overhead vs BAML prompts | semantically_similar_to | Context Engineering | boundaryml | baururazalinov, boundaryml, cole-medin |
| 30 | Agent as nested while loops / switch on actions | conceptually_related_to | Harness Engineering | boundaryml | baururazalinov, boundaryml, indydevdan |
| 31 | Reviewer Principle (separate reviewer model) | semantically_similar_to | Substring / fuzzy citation verification | baururazalinov | boundaryml |
| 32 | Cursor IDE for BAML project | references | Cursor | boundaryml | baururazalinov, boundaryml, cole-medin, indydevdan |
| 33 | OpenAI fallback client (GPT-4o -> mini) | references | Baururazalinov 2026 03 30 9F4B3Xzjjkq Openai | boundaryml | baururazalinov |
| 34 | Anthropic Computer Use | references | Baururazalinov 2026 03 30 9F4B3Xzjjkq Anthropic | boundaryml, indydevdan | baururazalinov |
| 35 | Anthropic Computer Use | implements | Dockerized computer-use client | boundaryml, indydevdan | boundaryml |
| 36 | Spatial reasoning limits in computer use | conceptually_related_to | Anthropic Computer Use | boundaryml | boundaryml, indydevdan |
| 37 | Human approval gate in Discord support bot | semantically_similar_to | Reviewer Principle (separate reviewer model) | boundaryml | baururazalinov |
| 38 | RAG context injection style guidance (readable blocks) | semantically_similar_to | Context Engineering | boundaryml | baururazalinov, boundaryml, cole-medin |
| 39 | v0 by Vercel (UI codegen) | conceptually_related_to | Cursor | boundaryml | baururazalinov, boundaryml, cole-medin, indydevdan |
| 40 | LangChain porting mention | semantically_similar_to | LangGraph | boundaryml | boundaryml, cole-medin, indydevdan |
