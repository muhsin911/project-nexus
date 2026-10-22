"""
Core configuration management for Project NEXUS.
Uses Pydantic V2 Settings for robust environment variable validation and type safety.
"""

from functools import lru_cache
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    Inherits from BaseSettings to automatically parse .env and OS environment variables.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ----------------------------------------------------------------------
    # Core Application Settings
    # ----------------------------------------------------------------------
    PROJECT_NAME: str = Field(default="Project NEXUS", description="Name of the project")
    DEBUG: bool = Field(default=False, description="Enable debug mode")
    ENVIRONMENT: str = Field(default="development", description="Environment (development, staging, production)")
    API_V1_PREFIX: str = Field(default="/api/v1", description="Base API prefix")

    # ----------------------------------------------------------------------
    # Security Settings
    # ----------------------------------------------------------------------
    SECRET_KEY: str = Field(
        default="super-secret-key-change-in-production", 
        description="Secret key for JWT and session management"
    )
    ALGORITHM: str = Field(default="HS256", description="JWT hashing algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60 * 24 * 7, description="JWT expiration time in minutes")

    # ----------------------------------------------------------------------
    # Database Settings (PostgreSQL + PostGIS)
    # ----------------------------------------------------------------------
    POSTGRES_USER: str = Field(default="nexus_user", description="PostgreSQL username")
    POSTGRES_PASSWORD: str = Field(default="nexus_secure_password_local", description="PostgreSQL password")
    POSTGRES_SERVER: str = Field(default="localhost", description="PostgreSQL server host")
    POSTGRES_PORT: int = Field(default=5432, description="PostgreSQL server port")
    POSTGRES_DB: str = Field(default="nexus_db", description="PostgreSQL database name")
    DB_ECHO: bool = Field(default=False, description="Enable SQLAlchemy query logging")

    @property
    def DATABASE_URL(self) -> str:
        """Constructs the async PostgreSQL connection string for SQLAlchemy 2.0."""
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # ----------------------------------------------------------------------
    # Redis Settings
    # ----------------------------------------------------------------------
    REDIS_HOST: str = Field(default="localhost", description="Redis server host")
    REDIS_PORT: int = Field(default=6379, description="Redis server port")
    REDIS_PASSWORD: str | None = Field(default=None, description="Redis password (if any)")
    REDIS_DB: int = Field(default=0, description="Redis database index")

    @property
    def REDIS_URL(self) -> str:
        """Constructs the Redis connection string."""
        auth = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{auth}{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    # ----------------------------------------------------------------------
    # Vector Database Settings (ChromaDB)
    # ----------------------------------------------------------------------
    CHROMA_HOST: str = Field(default="localhost", description="ChromaDB server host")
    CHROMA_PORT: int = Field(default=8000, description="ChromaDB server port")
    CHROMA_COLLECTION_NAME: str = Field(default="nexus_rag", description="Default ChromaDB collection name")

    @property
    def CHROMA_URL(self) -> str:
        """Constructs the ChromaDB connection URL."""
        return f"http://{self.CHROMA_HOST}:{self.CHROMA_PORT}"

    # ----------------------------------------------------------------------
    # Message Broker Settings (RabbitMQ)
    # ----------------------------------------------------------------------
    RABBITMQ_USER: str = Field(default="nexus_rabbit", description="RabbitMQ username")
    RABBITMQ_PASSWORD: str = Field(default="nexus_rabbit_pass_local", description="RabbitMQ password")
    RABBITMQ_HOST: str = Field(default="localhost", description="RabbitMQ server host")
    RABBITMQ_PORT: int = Field(default=5672, description="RabbitMQ server port")
    RABBITMQ_VHOST: str = Field(default="/", description="RabbitMQ virtual host")

    @property
    def RABBITMQ_URL(self) -> str:
        """Constructs the AMQP connection string for aio-pika."""
        return f"amqp://{self.RABBITMQ_USER}:{self.RABBITMQ_PASSWORD}@{self.RABBITMQ_HOST}:{self.RABBITMQ_PORT}/{self.RABBITMQ_VHOST}"

    # ----------------------------------------------------------------------
    # LLM & AI Provider Settings
    # ----------------------------------------------------------------------
    DEFAULT_LLM_PROVIDER: str = Field(default="groq", description="Default LLM provider (groq or gemini)")
    GROQ_API_KEY: str | None = Field(default=None, description="Groq API key for free-tier LLM access")
    GEMINI_API_KEY: str | None = Field(default=None, description="Google Gemini API key")
    EMBEDDING_MODEL: str = Field(default="sentence-transformers/all-MiniLM-L6-v2", description="Local embedding model fallback")
    
    # ----------------------------------------------------------------------
    # Rate Limiting & System Constraints (Free-Tier Optimized)
    # ----------------------------------------------------------------------
    RATE_LIMIT_REQUESTS: int = Field(default=10, description="Max requests per window for Leaky Bucket middleware")
    RATE_LIMIT_WINDOW_SECONDS: int = Field(default=1, description="Time window in seconds for rate limiting")
    MAX_CONCURRENT_AGENT_TASKS: int = Field(default=3, description="Max concurrent background tasks to respect free-tier limits")

    @model_validator(mode="after")
    def enforce_production_security(self) -> "Settings":
        """Prevent catastrophic misconfigurations in production."""
        if self.ENVIRONMENT == "production" and self.DEBUG:
            raise ValueError("DEBUG must be False in production environment")
        if self.ENVIRONMENT == "production" and self.SECRET_KEY == "super-secret-key-change-in-production":
            raise ValueError("SECRET_KEY must be changed in production environment")
        return self

    @model_validator(mode="after")
    def normalize_strings(self) -> "Settings":
        """Ensure specific string fields are always lowercase."""
        self.ENVIRONMENT = self.ENVIRONMENT.lower()
        self.DEFAULT_LLM_PROVIDER = self.DEFAULT_LLM_PROVIDER.lower()
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Singleton pattern via lru_cache to ensure Settings is instantiated only once.
    This prevents repeated parsing of environment variables and ensures consistency.
    """
    return Settings()


# Export a default instance for easy importing
settings = get_settings()