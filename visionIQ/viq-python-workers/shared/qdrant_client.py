"""Qdrant client wrapper with collection helpers."""

from __future__ import annotations

import logging

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

from .config import QDRANT_URL, QDRANT_API_KEY

logger = logging.getLogger(__name__)

_client: QdrantClient | None = None


def get_qdrant_client() -> QdrantClient:
    """Return the shared Qdrant client singleton."""
    global _client
    if _client is None:
        _client = QdrantClient(
            url=QDRANT_URL,
            api_key=QDRANT_API_KEY,
        )
        logger.info("Qdrant client created (%s)", QDRANT_URL)
    return _client


def ensure_collection(
    name: str,
    vector_size: int,
    distance: Distance = Distance.COSINE,
) -> None:
    """Create a collection if it doesn't already exist."""
    client = get_qdrant_client()
    collections = [c.name for c in client.get_collections().collections]
    if name not in collections:
        client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=vector_size, distance=distance),
        )
        logger.info("Created Qdrant collection %s (dim=%d)", name, vector_size)
