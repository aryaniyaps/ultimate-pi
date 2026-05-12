IndyDevDan (@indydevdan) — indexed subset of channel videos.

INCLUDE (title must match at least one regex in TITLE_POSITIVE; yt-dlp title only):
- Harness engineering: harness, agent harness, sandboxes (E2B), orchestration, Archon,
  OpenClaw, Ralph Wiggum, etc.
- AI agents: agentic, agents, subagents, multi-agent, swarm, Pi/CEO agents, skills, threads.
- Model providers / builder APIs: OpenAI, Anthropic, Claude, GPT, Gemini, Groq, Mistral,
  xAI/Grok, DeepSeek, Ollama, Bedrock, Azure OpenAI, MLX/Gemma local stacks, API/computer-use
  angles, Opus/Sonnet/Haiku/Mythos in technical titles.
- AI-enabled coding: Claude Code, Cursor, Copilot/CopilotKit, Codex, vibe coding (dev context),
  MCP, RAG for dev agents, hooks, plan mode, /PLAN, context engineering, SDK + agents, ACP.

EXCLUDE (TITLE_NEGATIVE): obvious crypto/finance spam, passive-income / get-rich patterns,
  unrelated trading/OnlyFans-style junk.

Title-filter regexes lived in removed channel fetch scripts; see git history. To index any watch URL: python3 scripts/index_youtube_urls.py <url>.
