from typing import AsyncGenerator, Optional
from google import genai
from app.agents.base import BaseAgent
from app.schemas import AgentRole, StreamChunk, StreamEventType
from app.gemini_client import stream_content_with_fallback

class ChaosAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="Vortex", role=AgentRole.CHAOS.value)

    async def process_turn(
        self, prompt: str, current_spec: str, current_mermaid: str, round_idx: int, client: genai.Client, model: Optional[str] = None
    ) -> AsyncGenerator[StreamChunk, None]:
        yield StreamChunk(event=StreamEventType.AGENT_START, agent=AgentRole.CHAOS, round_index=round_idx)

        instruction = (
            f"You are Vortex, a cynical, highly analytical Staff SRE and Chaos Engineer (Round {round_idx}).\n"
            "Your objective is to expose catastrophic edge cases and fragile assumptions in the architecture.\n\n"
            "Produce a focused audit section titled:\n"
            f"## 2. Chaos Engineering & Failure Mode Analysis (Round {round_idx})\n"
            "Examine:\n"
            "1. **Distributed System Pitfalls:** Partition tolerance, split-brain states, and message re-delivery duplicates.\n"
            "2. **Thundering Herd & Cascades:** Cache breakdown, circuit breaker tripping thresholds, and cold-start backpressure.\n"
            "3. **Data Integrity Leaks:** Deadlocks, asynchronous replication lag anomalies, and out-of-order writes.\n\n"
            "Use GitHub callouts (> [!WARNING] and > [!CAUTION]) for severe failure vectors with concrete mitigation demands."
        )

        full_prompt = (
            f"{instruction}\n\n"
            f"Core User Requirement: {prompt}\n\n"
            f"Current Architectural Specification:\n{current_spec}"
        )

        for token in stream_content_with_fallback(client, full_prompt, preferred_model=model):
            yield StreamChunk(
                event=StreamEventType.SPEC_DELTA,
                agent=AgentRole.CHAOS,
                delta=token,
                round_index=round_idx
            )

        yield StreamChunk(event=StreamEventType.AGENT_END, agent=AgentRole.CHAOS, round_index=round_idx)
