from typing import AsyncGenerator, Optional
from app.agents.architect import ArchitectAgent
from app.agents.chaos import ChaosAgent
from app.agents.security import SecurityAgent
from app.schemas import StreamChunk, StreamEventType
from app.gemini_client import get_gemini_client

class DebateOrchestrator:
    def __init__(self):
        self.architect = ArchitectAgent()
        self.chaos = ChaosAgent()
        self.security = SecurityAgent()

    async def run_pipeline(
        self, user_idea: str, rounds: int = 1, constraint: Optional[str] = None, api_key: Optional[str] = None, model: Optional[str] = None
    ) -> AsyncGenerator[StreamChunk, None]:
        client = get_gemini_client(api_key=api_key)
        current_spec = ""
        current_mermaid = ""

        effective_idea = user_idea
        if constraint and constraint.strip():
            effective_idea += f"\n\n[USER INJECTED CONSTRAINT / REQUIREMENT]: {constraint.strip()}"

        for r in range(1, rounds + 1):
            async for chunk in self.architect.process_turn(effective_idea, current_spec, current_mermaid, r, client, model):
                if chunk.event == StreamEventType.SPEC_DELTA:
                    current_spec += chunk.delta
                elif chunk.event == StreamEventType.MERMAID_UPDATE:
                    current_mermaid = chunk.delta
                yield chunk

            async for chunk in self.chaos.process_turn(effective_idea, current_spec, current_mermaid, r, client, model):
                if chunk.event == StreamEventType.SPEC_DELTA:
                    current_spec += chunk.delta
                yield chunk

            async for chunk in self.security.process_turn(effective_idea, current_spec, current_mermaid, r, client, model):
                if chunk.event == StreamEventType.SPEC_DELTA:
                    current_spec += chunk.delta
                elif chunk.event == StreamEventType.MERMAID_UPDATE:
                    current_mermaid = chunk.delta
                yield chunk

        yield StreamChunk(
            event=StreamEventType.RUN_COMPLETE,
            delta="Debate forge concluded. Spec ready for export.",
            round_index=rounds
        )

