"""
Agents Module.
Exposes the Agent Factory and concrete agent implementations.
"""

from app.ai.agents.base import BaseAgent
from app.ai.agents.factory import AgentFactory
from app.ai.agents.job_scraper import JobScraperAgent

# Register agents with the factory
AgentFactory.register(JobScraperAgent)

__all__ = [
    "BaseAgent",
    "AgentFactory",
    "JobScraperAgent",
]