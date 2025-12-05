"""FastAPI entrypoint wiring the ChatKit server endpoint."""

from __future__ import annotations

from chatkit.server import StreamingResult
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import Response, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from .server import StarterChatServer, create_chatkit_server

app = FastAPI(title="ChatKit Starter API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_chatkit_server: StarterChatServer | None = create_chatkit_server()


def get_chatkit_server() -> StarterChatServer:
    if _chatkit_server is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "ChatKit dependencies are missing. Install the ChatKit Python "
                "package to enable the conversational endpoint."
            ),
        )
    return _chatkit_server


@app.post("/chatkit")
async def chatkit_endpoint(
    request: Request, server: StarterChatServer = Depends(get_chatkit_server)
) -> Response:
    payload = await request.body()
    result = await server.process(payload, {"request": request})
    if isinstance(result, StreamingResult):
        return StreamingResponse(result, media_type="text/event-stream")
    if hasattr(result, "json"):
        return Response(content=result.json, media_type="application/json")
    return JSONResponse(result)
