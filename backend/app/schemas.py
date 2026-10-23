from enum import Enum
from pydantic import BaseModel
from typing import Optional

class AgentRole(str, Enum):
    ARCHITECT = "architect"
    CHAOS = "chaos"
    SECURITY = "security"

class StreamEventType(str, Enum):
    AGENT_START = "agent_start"
    SPEC_DELTA = "spec_delta"
    MERMAID_UPDATE = "mermaid_update"
    AGENT_END = "agent_end"
    RUN_COMPLETE = "run_complete"

class StreamChunk(BaseModel):
    event: StreamEventType
    agent: Optional[AgentRole] = None
    delta: str = ""
    round_index: int = 1
