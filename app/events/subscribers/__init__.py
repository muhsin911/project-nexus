"""
Event Subscribers Registry.
"""

from app.events.subscribers.job_subscriber import on_job_scraped

__all__ = [
    "on_job_scraped",
]