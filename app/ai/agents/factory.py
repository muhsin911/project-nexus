"""
Agent Factory.
Implements the Factory Pattern for dynamic, registry-based agent instantiation.
"""

from typing import Any, Type

from app.ai.agents.base import BaseAgent


class AgentFactory:
    """
    Registry-based factory for creating AI agents.
    
    Usage:
        1. Decorate agent classes with @AgentFactory.register
        2. Instantiate via AgentFactory.create("agent_name", **kwargs)
    """

    _registry: dict[str, Type[BaseAgent]] = {}

    @classmethod
    def register(cls, agent_class: Type[BaseAgent]) -> Type[BaseAgent]:
        """
        Decorator to register an agent class in the factory registry.
        """
        # Instantiate temporarily to get the name, then register the class
        instance = agent_class()
        cls._registry[instance.name] = agent_class
        return agent_class

    @classmethod
    def create(cls, agent_name: str, **kwargs: Any) -> BaseAgent:
        """
        Dynamically instantiate an agent by its registered name.
        
        Raises:
            ValueError: If the agent name is not found in the registry.
        """
        if agent_name not in cls._registry:
            available = ", ".join(cls._registry.keys())
            raise ValueError(f"Unknown agent: '{agent_name}'. Available: {available}")
        
        agent_class = cls._registry[agent_name]
        return agent_class(**kwargs)