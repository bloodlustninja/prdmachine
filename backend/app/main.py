from typing import Optional
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from app.orchestrator import DebateOrchestrator

app = FastAPI(title="PRDMachine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = DebateOrchestrator()

@app.get("/api/health")
async def health():
    return {"status": "healthy"}

@app.get("/api/rfc/stream")
async def stream_rfc(
    idea: str = Query(...),
    rounds: int = Query(default=1, ge=1, le=3),
    constraint: Optional[str] = Query(default=None)
):
    async def event_generator():
        async for chunk in orchestrator.run_pipeline(user_idea=idea, rounds=rounds, constraint=constraint):
            if hasattr(chunk, "model_dump_json"):
                yield chunk.model_dump_json()
            elif hasattr(chunk, "json"):
                yield chunk.json()
            else:
                yield str(chunk)
            
    return EventSourceResponse(event_generator(), ping=15)
