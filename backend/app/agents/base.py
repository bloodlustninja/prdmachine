from abc import ABC, abstractmethod
from typing import AsyncGenerator
from app.schemas import StreamChunk

class BaseAgent(ABC):
    def __init__(self, name: str, role: str):
        self.name = name
        self.role = role

    @abstractmethod
    async def process_turn(
        self, prompt: str, current_spec: str, current_mermaid: str, round_idx: int
    ) -> AsyncGenerator[StreamChunk, None]:
        pass
