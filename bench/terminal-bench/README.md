# Harbor Terminal-Bench harness check

Docs reference:
- https://www.harborframework.com/docs/agents
- https://www.harborframework.com/docs/tutorials/running-terminal-bench

## 1) Install Harbor and verify with oracle

```bash
harbor run -d terminal-bench/terminal-bench-2 -a oracle
```

## 2) Run this repo custom agent adapter

From repo root:

```bash
bench/terminal-bench/run-terminal-bench.sh
```

Equivalent Harbor command:

```bash
harbor run \
  -d terminal-bench/terminal-bench-2 \
  --agent-import-path bench.terminal_bench.agents.ultimate_pi_agent:UltimatePiInstalledAgent
```

## 3) Optional env overrides

- `ULTIMATE_PI_INSTALL_CMD`: install/setup command inside Harbor task env.
  - default: `npm install -g ultimate-pi && pi install ultimate-pi -l`
- `ULTIMATE_PI_RUN_CMD`: command template used per task.
  - must include `__INSTRUCTION__` placeholder.
  - default: `pi -p __INSTRUCTION__`
- `ULTIMATE_PI_TRAJECTORY_PATH`: where run log is written.
  - default: `/tmp/ultimate-pi-trajectory.log`

Example:

```bash
export ULTIMATE_PI_RUN_CMD="pi -p __INSTRUCTION__"
bench/terminal-bench/run-terminal-bench.sh -n 8 --env daytona
```
