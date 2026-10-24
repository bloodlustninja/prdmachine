import re
from typing import AsyncGenerator, Optional
from google import genai
from app.agents.base import BaseAgent
from app.schemas import AgentRole, StreamChunk, StreamEventType
from app.gemini_client import stream_content_with_fallback

class SecurityAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="Sentinel", role=AgentRole.SECURITY.value)

    async def process_turn(
        self, prompt: str, current_spec: str, current_mermaid: str, round_idx: int, client: genai.Client, model: Optional[str] = None
    ) -> AsyncGenerator[StreamChunk, None]:
        yield StreamChunk(event=StreamEventType.AGENT_START, agent=AgentRole.SECURITY, round_index=round_idx)

        instruction = (
            f"You are Sentinel, Principal Security Architect and Threat Modeler (Round {round_idx}).\n"
            "Perform an uncompromising zero-trust evaluation of the system topology.\n\n"
            "Produce:\n"
            f"## 3. Threat Model & Zero-Trust Security Controls (Round {round_idx})\n"
            "1. **STRIDE Assessment Matrix:** Tabulate Threat, Impacted Component, and Countermeasure.\n"
            "2. **Identity & Auth Boundary:** Token lifecycle, mTLS mesh enforcement, and secret rotation.\n"
            "3. **Data Boundary & Regulatory Compliance:** Encryption at rest/transit and audit access trails.\n\n"
            "MANDATORY: Output an UPDATED, hardened Mermaid diagram enclosed in ```mermaid ... ``` blocks.\n"
            "Inject WAF, API Gateway rate limiters, auth middleware, and segmented VPC subnets into the topology."
        )

        full_prompt = (
            f"{instruction}\n\n"
            f"System Concept: {prompt}\n\n"
            f"Current RFC Body:\n{current_spec}\n\n"
            f"Existing Topology Diagram:\n{current_mermaid}"
        )

        full_response = ""
        for token in stream_content_with_fallback(client, full_prompt, preferred_model=model):
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
