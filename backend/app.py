"""Vercel FastAPI entrypoint. Training dependencies are not needed for inference."""

from src.api.app import app

__all__ = ["app"]
