import os
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

@app.get("/")
@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "PRDMachine API"}

@app.get("/api/rfc/stream")
async def stream_rfc(
    idea: str = Query(...),
    rounds: int = Query(default=1, ge=1, le=3),
    constraint: Optional[str] = Query(default=None),
    api_key: Optional[str] = Query(default=None),
    model: Optional[str] = Query(default="gemini-2.5-flash-lite")
):
    async def event_generator():
        try:
            async for chunk in orchestrator.run_pipeline(
                user_idea=idea, rounds=rounds, constraint=constraint, api_key=api_key, model=model
            ):
                payload_str = chunk.model_dump_json() if hasattr(chunk, "model_dump_json") else chunk.json()
                yield {
                    "event": "message",
                    "data": payload_str
                }
        except Exception as err:
            import json
            yield {
                "event": "message",
                "data": json.dumps({"event": "error", "delta": str(err)})
            }

    return EventSourceResponse(
        event_generator(),
        ping=10,
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )
