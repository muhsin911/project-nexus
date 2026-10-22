"""
Base Agent Contract.
Defines the interface for all autonomous agents in the system.
"""

from abc import ABC, abstractmethod
from typing import Any


class BaseAgent(ABC):
    """Abstract base class for all AI agents."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier for the agent."""
        pass

    @abstractmethod
    async def run(self, **kwargs: Any) -> Any:
        """
        Execute the agent's primary task.
        
        Args:
            **kwargs: Task-specific parameters (e.g., job_url, user_query).
            
        Returns:
            The result of the agent's execution.
        """
        pass