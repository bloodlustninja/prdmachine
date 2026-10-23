from typing import AsyncGenerator
from app.agents.base import BaseAgent
from app.schemas import AgentRole, StreamChunk, StreamEventType
from app.gemini_client import get_gemini_client, stream_content_with_fallback

class ChaosAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="Vortex", role=AgentRole.CHAOS.value)
        self.client = get_gemini_client()

    async def process_turn(
        self, prompt: str, current_spec: str, current_mermaid: str, round_idx: int
    ) -> AsyncGenerator[StreamChunk, None]:
        yield StreamChunk(event=StreamEventType.AGENT_START, agent=AgentRole.CHAOS, round_index=round_idx)

        system_instruction = (
            "You are Vortex, a Chaos & Resilience Engineer. Your job is to aggressively challenge the Architect's RFC.\n"
            "Audit the current spec for:\n"
            "- Concurrency bugs and race conditions\n"
            "- Distributed split-brain or network partitions\n"
            "- Cache invalidation traps and high-load bottlenecks\n\n"
            "Output your findings under:\n"
            "## 2. Chaos Engineering & Failure Modes\n"
            "Use blockquotes (> [!WARNING]) for danger spots and concrete mitigation bullet points."
        )

        full_prompt = (
            f"{system_instruction}\n\n"
            f"User Product Idea: {prompt}\n\n"
            f"Current Architect Draft:\n{current_spec}"
        )

        for token in stream_content_with_fallback(self.client, full_prompt):
            yield StreamChunk(
                event=StreamEventType.SPEC_DELTA,
                agent=AgentRole.CHAOS,
                delta=token,
                round_index=round_idx
            )

        yield StreamChunk(event=StreamEventType.AGENT_END, agent=AgentRole.CHAOS, round_index=round_idx)
