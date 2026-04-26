from __future__ import annotations

import os
import shlex

from harbor.agents.installed.base import BaseInstalledAgent, with_prompt_template
from harbor.environments.base import BaseEnvironment
from harbor.models.agent.context import AgentContext

TRAJECTORY_PATH = os.getenv("ULTIMATE_PI_TRAJECTORY_PATH", "/tmp/ultimate-pi-trajectory.log")


class UltimatePiInstalledAgent(BaseInstalledAgent):
    """Harbor adapter to evaluate ultimate-pi on Terminal-Bench."""

    @staticmethod
    def name() -> str:
        return "ultimate-pi"

    def version(self) -> str | None:
        return os.getenv("ULTIMATE_PI_AGENT_VERSION", "dev")

    async def install(self, environment: BaseEnvironment) -> None:
        install_cmd = os.getenv(
            "ULTIMATE_PI_INSTALL_CMD",
            "npm install -g ultimate-pi && pi install ultimate-pi -l",
        )
        await self.exec_as_agent(environment, command=install_cmd)

    @with_prompt_template
    async def run(
        self,
        instruction: str,
        environment: BaseEnvironment,
        context: AgentContext,
    ) -> None:
        run_template = os.getenv(
            "ULTIMATE_PI_RUN_CMD",
            "pi -p __INSTRUCTION__",
        )
        quoted_instruction = shlex.quote(instruction)
        run_cmd = run_template.replace("__INSTRUCTION__", quoted_instruction)
        command = f"set -o pipefail; {run_cmd} | tee {shlex.quote(TRAJECTORY_PATH)}"
        await self.exec_as_agent(environment, command=command, check=False)

    def populate_context_post_run(self, context: AgentContext) -> None:
        note = f"ultimate-pi trajectory saved at {TRAJECTORY_PATH}"

        if hasattr(context, "notes") and isinstance(context.notes, list):
            context.notes.append(note)
            return

        if hasattr(context, "summary") and isinstance(context.summary, str):
            context.summary = f"{context.summary}\n{note}".strip()
