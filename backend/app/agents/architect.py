import re
from typing import AsyncGenerator
from app.agents.base import BaseAgent
from app.schemas import AgentRole, StreamChunk, StreamEventType
from app.gemini_client import get_gemini_client, stream_content_with_fallback

class ArchitectAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="Aegis", role=AgentRole.ARCHITECT.value)
        self.client = get_gemini_client()

    async def process_turn(
        self, prompt: str, current_spec: str, current_mermaid: str, round_idx: int
    ) -> AsyncGenerator[StreamChunk, None]:
        yield StreamChunk(event=StreamEventType.AGENT_START, agent=AgentRole.ARCHITECT, round_index=round_idx)

        system_instruction = (
            "You are Aegis, a Principal System Architect. Given a software idea, draft the baseline "
            "Technical Design Document (RFC) in clean GitHub-flavored Markdown.\n"
            "Include:\n"
            "## 1. System Overview\n"
            "### 1.1 Core Architecture Components\n"
            "### 1.2 Data Flow & Storage Model\n\n"
            "CRITICAL: You MUST include a valid, clean Mermaid.js flowchart enclosed in ```mermaid ... ``` blocks "
            "illustrating the primary components, databases, and network gateways."
        )

        full_prompt = f"{system_instruction}\n\nUser Idea: {prompt}"

        full_response = ""
        for token in stream_content_with_fallback(self.client, full_prompt):
            full_response += token
            yield StreamChunk(
                event=StreamEventType.SPEC_DELTA,
                agent=AgentRole.ARCHITECT,
                delta=token,
                round_index=round_idx
            )

        mermaid_match = re.search(r"```mermaid\s*\n(.*?)\n```", full_response, re.DOTALL)
        if mermaid_match:
            yield StreamChunk(
                event=StreamEventType.MERMAID_UPDATE,
                agent=AgentRole.ARCHITECT,
                delta=mermaid_match.group(1).strip(),
                round_index=round_idx
            )

        yield StreamChunk(event=StreamEventType.AGENT_END, agent=AgentRole.ARCHITECT, round_index=round_idx)
