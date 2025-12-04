"""ChatKit server wired to a minimal streamed assistant."""

from __future__ import annotations

import logging
from typing import Any, AsyncIterator

from agents import Runner
from chatkit.agents import stream_agent_response
from chatkit.server import ChatKitServer
from chatkit.types import (
    Action,
    Attachment,
    StreamOptions,
    WidgetItem,
    ThreadMetadata,
    ThreadStreamEvent,
    UserMessageItem,
)

from .assistant import StarterAgentContext, assistant_agent
from .memory_store import MemoryStore
from .thread_item_converter import BasicThreadItemConverter

logging.basicConfig(level=logging.INFO)


class StarterChatServer(ChatKitServer[dict[str, Any]]):
    """ChatKit server that streams responses from a single assistant agent."""

    def __init__(self) -> None:
        self.store: MemoryStore = MemoryStore()
        self.thread_item_converter = BasicThreadItemConverter()
        super().__init__(self.store)

    # -- ChatKit hooks ----------------------------------------------------
    async def action(
        self,
        thread: ThreadMetadata,
        action: Action[str, Any],
        sender: WidgetItem | None,
        context: dict[str, Any],
    ) -> AsyncIterator[ThreadStreamEvent]:
        # No custom actions in the starter demo.
        return

    async def respond(
        self,
        thread: ThreadMetadata,
        item: UserMessageItem | None,
        context: dict[str, Any],
    ) -> AsyncIterator[ThreadStreamEvent]:
        # Load recent items so the agent sees the conversation history.
        items_page = await self.store.load_thread_items(
            thread.id,
            after=None,
            limit=30,
            order="desc",
            context=context,
        )
        items = list(reversed(items_page.data))
        input_items = await self.thread_item_converter.to_agent_input(items)

        agent_context = StarterAgentContext(
            thread=thread,
            store=self.store,
            request_context=context,
        )

        result = Runner.run_streamed(
            assistant_agent,
            input_items,
            context=agent_context,
        )

        async for event in stream_agent_response(agent_context, result):
            yield event
        return

    def get_stream_options(
        self, thread: ThreadMetadata, context: dict[str, Any]
    ) -> StreamOptions:
        # Allow cancelling mid-stream; the in-memory store will keep partial history.
        return StreamOptions(allow_cancel=True)


def create_chatkit_server() -> StarterChatServer | None:
    """Return a configured ChatKit server instance if dependencies are available."""
    return StarterChatServer()
