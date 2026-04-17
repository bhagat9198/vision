"""Redis Streams consumer/producer for VisionIQ Python workers."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Awaitable, Callable

import redis.asyncio as aioredis

from .config import REDIS_HOST, REDIS_PORT, REDIS_PASSWORD

logger = logging.getLogger(__name__)

# ─── Stream topic constants (must match Node.js side) ──────────────────────────

STREAM_TOPICS = {
    "VIDEO_UPLOADED": "video.uploaded",
    "FRAMES_EXTRACTED": "frames.extracted",
    "FRAMES_MOTION": "frames.motion",
    "FRAME_DESCRIBED": "frame.described",
    "SESSION_EVALUATE": "session.evaluate",
    "SESSION_RULES_READY": "session.rules_ready",
    "EVENT_CREATED": "event.created",
    "EVENT_WRITTEN": "event.written",
}

MessageHandler = Callable[[str, dict[str, str]], Awaitable[None]]


class RedisStreamConsumer:
    """Async Redis Streams consumer using consumer groups."""

    def __init__(
        self,
        host: str = REDIS_HOST,
        port: int = REDIS_PORT,
        password: str | None = REDIS_PASSWORD,
    ) -> None:
        self._host = host
        self._port = port
        self._password = password
        self._client: aioredis.Redis | None = None

    # ── Connection ─────────────────────────────────────────────────────────

    async def connect(self) -> None:
        self._client = aioredis.Redis(
            host=self._host,
            port=self._port,
            password=self._password,
            decode_responses=True,
        )
        await self._client.ping()
        logger.info("Redis Streams connected (%s:%s)", self._host, self._port)

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None
            logger.info("Redis Streams disconnected")

    @property
    def client(self) -> aioredis.Redis:
        if self._client is None:
            raise RuntimeError("RedisStreamConsumer not connected — call connect() first")
        return self._client

    # ── Publish ────────────────────────────────────────────────────────────

    async def publish(self, stream: str, data: dict[str, Any]) -> str:
        """XADD a message to *stream*. Returns the message ID."""
        fields = {k: str(v) for k, v in data.items()}
        msg_id: bytes | str = await self.client.xadd(stream, fields)
        return str(msg_id)

    # ── Consumer group helpers ─────────────────────────────────────────────

    async def ensure_group(self, stream: str, group: str, start_id: str = "0") -> None:
        """Create a consumer group (MKSTREAM). No-op if it already exists."""
        try:
            await self.client.xgroup_create(stream, group, id=start_id, mkstream=True)
        except aioredis.ResponseError as exc:
            if "BUSYGROUP" not in str(exc):
                raise

    async def ack(self, stream: str, group: str, msg_id: str) -> None:
        await self.client.xack(stream, group, msg_id)

    # ── Blocking consume loop ──────────────────────────────────────────────

    async def consume_loop(
        self,
        stream: str,
        group: str,
        consumer: str,
        handler: MessageHandler,
        *,
        count: int = 10,
        block_ms: int = 5000,
    ) -> None:
        """
        Blocking read loop using XREADGROUP.
        Processes pending messages first, then switches to new ('>').
        """
        await self.ensure_group(stream, group)
        start_id = "0"  # read pending first

        while True:
            results: list | None = await self.client.xreadgroup(
                groupname=group,
                consumername=consumer,
                streams={stream: start_id},
                count=count,
                block=block_ms,
            )

            if not results:
                if start_id == "0":
                    start_id = ">"
                continue

            for _stream_name, messages in results:
                for msg_id, fields in messages:
                    try:
                        await handler(msg_id, fields)
                        await self.ack(stream, group, msg_id)
                    except Exception:
                        logger.exception("Error processing %s on %s", msg_id, stream)

            if start_id == "0":
                start_id = ">"
