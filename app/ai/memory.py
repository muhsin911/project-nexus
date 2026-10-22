"""
Dual-Tier Memory System for AI Agents.
Updated to use LangChain Chroma wrapper for native Strategy Pattern support.
"""

import logging

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.messages import BaseMessage

from app.ai.clients import get_embeddings
from app.ai.rag.strategies import RetrievalStrategy, CosineSimilarityStrategy
from app.core.config import settings

logger = logging.getLogger(__name__)


class ShortTermMemory:
    """In-memory conversation history for the current agent session."""

    def __init__(self) -> None:
        self._messages: list[BaseMessage] = []

    def add_message(self, message: BaseMessage) -> None:
        self._messages.append(message)

    def get_messages(self) -> list[BaseMessage]:
        return self._messages

    def clear(self) -> None:
        self._messages.clear()


class LongTermMemory:
    """
    ChromaDB-backed vector store for semantic retrieval.
    Delegates the actual retrieval algorithm to a pluggable Strategy.
    """

    def __init__(self) -> None:
        logger.info(f"Connecting to ChromaDB at {settings.CHROMA_URL}...")
        
        # LangChain Chroma wrapper handles embedding function and collection creation
        self._vectorstore = Chroma(
            collection_name=settings.CHROMA_COLLECTION_NAME,
            embedding_function=get_embeddings(),
            client_settings={
                "host": settings.CHROMA_HOST,
                "port": settings.CHROMA_PORT,
            },
        )
        logger.info(f"ChromaDB collection '{settings.CHROMA_COLLECTION_NAME}' ready.")

    def add_documents(self, documents: list[Document], ids: list[str]) -> None:
        """Upsert documents into the vector store."""
        if not documents:
            return
        self._vectorstore.add_documents(documents, ids=ids)
        logger.debug(f"Upserted {len(documents)} documents into ChromaDB.")

    def search(
        self, 
        query: str, 
        k: int = 3, 
        strategy: RetrievalStrategy | None = None
    ) -> list[Document]:
        """
        Retrieve documents using the specified strategy (defaults to Cosine Similarity).
        """
        active_strategy = strategy or CosineSimilarityStrategy()
        return active_strategy.retrieve(self._vectorstore, query, k)


# Singletons
short_term_memory = ShortTermMemory()
long_term_memory = LongTermMemory()