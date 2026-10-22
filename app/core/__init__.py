"""
Core module for Project NEXUS.
Exposes configuration, core utilities, and infrastructure clients.
"""

from app.core.config import get_settings, settings
from app.core.redis import get_redis_client

__all__ = ["get_settings", "settings", "get_redis_client"]