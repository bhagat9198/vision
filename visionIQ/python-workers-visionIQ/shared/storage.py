"""Shared-storage path helpers for VisionIQ assets."""

from __future__ import annotations

import os

from .config import SHARED_STORAGE_PATH

_BASE = os.path.join(SHARED_STORAGE_PATH, "visioniq")


def get_video_path(job_id: str) -> str:
    """Return the path for an uploaded video: shared-storage/visioniq/videos/{job_id}.mp4"""
    return os.path.join(_BASE, "videos", f"{job_id}.mp4")


def get_frames_dir(job_id: str) -> str:
    """Return the directory for extracted frames: shared-storage/visioniq/frames/{job_id}/"""
    return os.path.join(_BASE, "frames", job_id)


def get_thumbnail_path(event_id: str) -> str:
    """Return the path for an event thumbnail: shared-storage/visioniq/thumbnails/{event_id}.jpg"""
    return os.path.join(_BASE, "thumbnails", f"{event_id}.jpg")
