"""Shared configuration — loads env vars with sensible defaults."""

import os
from dotenv import load_dotenv

load_dotenv()

REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD: str | None = os.getenv("REDIS_PASSWORD") or None

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/visioniq",
)

QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY: str | None = os.getenv("QDRANT_API_KEY") or None

SHARED_STORAGE_PATH: str = os.getenv(
    "SHARED_STORAGE_PATH",
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "common", "shared-storage"),
)

OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
