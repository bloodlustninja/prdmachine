import re
from typing import AsyncGenerator, Optional
from google import genai
from app.agents.base import BaseAgent
from app.schemas import AgentRole, StreamChunk, StreamEventType
from app.gemini_client import stream_content_with_fallback

class ArchitectAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="Aegis", role=AgentRole.ARCHITECT.value)

    async def process_turn(
        self, prompt: str, current_spec: str, current_mermaid: str, round_idx: int, client: genai.Client, model: Optional[str] = None
    ) -> AsyncGenerator[StreamChunk, None]:
        yield StreamChunk(event=StreamEventType.AGENT_START, agent=AgentRole.ARCHITECT, round_index=round_idx)

        if round_idx == 1:
            instruction = (
                "You are Aegis, a seasoned Principal Systems Architect. Draft a rigorous, production-grade Technical RFC.\n"
                "Adopt an authoritative, precise engineering tone.\n\n"
                "Structure your output strictly with the following sections:\n"
                "# RFC: System Architecture Specification\n"
                "## 1. Executive Summary & Core Requirements\n"
                "- Primary Functional Requirements\n"
                "- Non-Functional Targets (Latency SLOs, P99 guarantees, expected throughput)\n"
                "## 2. Component Topology & Data Flow\n"
                "Explain the end-to-end data pathway, storage layer choices (SQL vs NoSQL vs In-Memory), and state coordination.\n\n"
                "CRITICAL: Enclose a clean, valid Mermaid flowchart illustrating all ingestion gates, services, queues, and datastores:\n"
                "```mermaid\n"
                "graph TD\n"
                "...\n"
                "```\n"
            )
            full_prompt = f"{instruction}\n\nProject Scope:\n{prompt}"
        else:
            instruction = (
                f"You are Aegis, Principal Systems Architect. This is Round {round_idx} of debate.\n"
                "Review the previous critique provided by Vortex (Chaos) and Sentinel (Security).\n"
                "Add a revision section titled:\n"
                f"## 4. Architect Revision & Mitigation Synthesis (Round {round_idx})\n"
                "- Formulate direct design adjustments addressing identified race conditions and auth vulnerabilities.\n"
                "- Clarify tradeoffs made between consistency (CAP theorem) and developer velocity."
            )
            full_prompt = (
                f"{instruction}\n\n"
                f"Original Scope: {prompt}\n\n"
                f"Current Working RFC Draft:\n{current_spec}"
            )

        full_response = ""
        for token in stream_content_with_fallback(client, full_prompt, preferred_model=model):
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
