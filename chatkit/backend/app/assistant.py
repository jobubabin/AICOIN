"""Simple streaming assistant wired to ChatKit."""

from __future__ import annotations

from typing import Any, Annotated

from agents import Agent
from chatkit.agents import AgentContext
from pydantic import ConfigDict, Field
from .memory_store import MemoryStore

MODEL = "gpt-4.1-mini"


class StarterAgentContext(AgentContext):
    """Minimal context passed into the ChatKit agent runner."""

    model_config = ConfigDict(arbitrary_types_allowed=True)
    request_context: dict[str, Any]
    # The store is excluded so it isn't serialized into prompts.
    store: Annotated[MemoryStore, Field(exclude=True)]


assistant_agent = Agent[StarterAgentContext](
    model=MODEL,
    name="Starter Assistant",
    instructions=(
        "You are a concise, helpful assistant. "
        "Keep replies short and focus on directly answering the user's request."
    ),
)
