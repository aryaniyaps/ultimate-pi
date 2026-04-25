# 0020 - Default Harbor adapter to PI non-interactive prompt flag

- Date: 2026-04-25
- Status: Accepted

## Context
Benchmark adapter currently used `pi run --instruction __INSTRUCTION__` as default execution command.
Local PI CLI help shows non-interactive mode as `pi -p "<prompt>"`.
Need default command aligned with actual PI CLI behavior to avoid run failures in Harbor trials.

## Alternatives
1. Keep `pi run --instruction ...` and require env override in all environments.
2. Switch default to `pi -p __INSTRUCTION__` while retaining env override support.
3. Do runtime command autodetection by probing CLI subcommands per trial.

## Chosen option
Adopt option 2.

## Rationale
- Matches current documented PI CLI non-interactive invocation.
- Minimal, deterministic change.
- Preserves flexibility with `ULTIMATE_PI_RUN_CMD` override.

## Consequences
- Adapter works out-of-box in environments with standard PI CLI.
- Existing users depending on old default must set env override explicitly.
