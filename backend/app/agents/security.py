import re
from typing import AsyncGenerator
from app.agents.base import BaseAgent
from app.schemas import AgentRole, StreamChunk, StreamEventType
from app.gemini_client import get_gemini_client, stream_content_with_fallback

class SecurityAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="Sentinel", role=AgentRole.SECURITY.value)
        self.client = get_gemini_client()

    async def process_turn(
        self, prompt: str, current_spec: str, current_mermaid: str, round_idx: int
    ) -> AsyncGenerator[StreamChunk, None]:
        yield StreamChunk(event=StreamEventType.AGENT_START, agent=AgentRole.SECURITY, round_index=round_idx)

        system_instruction = (
            "You are Sentinel, Principal Security & Threat Modeling Agent. Review the spec and architecture topology.\n"
            "1. Output a section titled '## 3. Threat Model & Security Controls' detailing token lifecycle, auth boundaries, encryption, and zero-trust perimeter.\n"
            "2. Produce an UPDATED, hardened ```mermaid ... ``` diagram that injects required auth guards, firewalls, and encryption boundaries."
        )

        full_prompt = (
            f"{system_instruction}\n\n"
            f"Product Idea: {prompt}\n\n"
            f"Current RFC Spec:\n{current_spec}\n\n"
            f"Current Topology:\n{current_mermaid}"
        )

        full_response = ""
        for token in stream_content_with_fallback(self.client, full_prompt):
            full_response += token
            yield StreamChunk(
                event=StreamEventType.SPEC_DELTA,
                agent=AgentRole.SECURITY,
                delta=token,
                round_index=round_idx
            )

        mermaid_match = re.search(r"```mermaid\s*\n(.*?)\n```", full_response, re.DOTALL)
        if mermaid_match:
            yield StreamChunk(
                event=StreamEventType.MERMAID_UPDATE,
                agent=AgentRole.SECURITY,
                delta=mermaid_match.group(1).strip(),
                round_index=round_idx
            )

        yield StreamChunk(event=StreamEventType.AGENT_END, agent=AgentRole.SECURITY, round_index=round_idx)
