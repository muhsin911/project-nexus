"""
Dual-Tier Memory System for AI Agents.
- ShortTermMemory: In-memory conversation history (working memory).
- LongTermMemory: ChromaDB-backed vector store for semantic retrieval (RAG).
"""

import logging
from typing import Any

import chromadb
from langchain_core.documents import Document
from langchain_core.messages import BaseMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


# -----------------------------------------------------------------------------
# Short-Term Memory (Working Memory)
# -----------------------------------------------------------------------------
class ShortTermMemory:
    """
    In-memory conversation history for the current agent session.
    
    Note: For production persistence across restarts, this would be backed by 
    Redis or Postgres. In-memory is sufficient for the current free-tier scope 
    and simplifies the initial agent loop.
    """

    def __init__(self) -> None:
        self._messages: list[BaseMessage] = []

    def add_message(self, message: BaseMessage) -> None:
        """Append a message to the conversation history."""
        self._messages.append(message)

    def get_messages(self) -> list[BaseMessage]:
        """Retrieve the full conversation history."""
        return self._messages

    def clear(self) -> None:
        """Clear the conversation history."""
        self._messages.clear()


# -----------------------------------------------------------------------------
# Long-Term Memory (Vector Store / RAG)
# -----------------------------------------------------------------------------
class LongTermMemory:
    """
    ChromaDB-backed vector store for semantic retrieval.
    Handles document upserts and similarity searches for RAG context.
    """

    def __init__(self) -> None:
        logger.info(f"Connecting to ChromaDB at {settings.CHROMA_URL}...")
        self._client = chromadb.HttpClient(
            host=settings.CHROMA_HOST,
            port=settings.CHROMA_PORT,
        )
        # get_or_create_collection is idempotent and safe for concurrent startups
        self._collection = self._client.get_or_create_collection(
            name=settings.CHROMA_COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"}  # Optimized for normalized embeddings
        )
        logger.info(f"ChromaDB collection '{settings.CHROMA_COLLECTION_NAME}' ready.")

    def add_documents(self, documents: list[Document], ids: list[str]) -> None:
        """
        Upsert documents into the vector store.
        
        Args:
            documents: List of LangChain Document objects (must have .page_content and .metadata).
            ids: List of unique IDs corresponding to each document.
        """
        if not documents:
            return

        texts = [doc.page_content for doc in documents]
        metadatas = [doc.metadata for doc in documents]

        self._collection.upsert(
            ids=ids,
            documents=texts,
            metadatas=metadatas,
        )
        logger.debug(f"Upserted {len(documents)} documents into ChromaDB.")

    def search(self, query: str, k: int = 3) -> list[Document]:
        """
        Retrieve the top-k most relevant documents for a given query.
        
        Args:
            query: The search query (will be embedded automatically by Chroma if using default embedding fn, 
                   but we will pass pre-computed embeddings from the agent nodes for consistency).
            k: Number of results to return.
            
        Returns:
            List of LangChain Document objects.
        """
        # Note: ChromaDB can embed the query internally if configured, but for explicit control 
        # and to use our specific HuggingFace model, we will compute embeddings in the node.
        # This method assumes the query is already embedded or we use Chroma's default.
        # For this implementation, we will use the `query` text directly and let Chroma handle it 
        # via its default embedding function, OR we can pass embeddings explicitly.
        # To keep it simple and aligned with our `get_embeddings()` singleton, we will 
        # compute embeddings in the `retrieve_node` and pass them here.
        
        # Let's refactor this to accept pre-computed embeddings for consistency.
        raise NotImplementedError("Use search_with_embeddings instead for explicit control.")

    def search_with_embeddings(self, query_embedding: list[float], k: int = 3) -> list[Document]:
        """
        Retrieve documents using pre-computed query embeddings.
        """
        results = self._collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            include=["documents", "metadatas", "distances"]
        )

        documents = []
        if results and results["documents"] and results["documents"][0]:
            for i, doc_text in enumerate(results["documents"][0]):
                metadata = results["metadatas"][0][i] if results["metadatas"] else {}
                distance = results["distances"][0][i] if results["distances"] else 0.0
                
                # Chroma returns cosine distance (1 - similarity). Convert back for clarity.
                similarity = 1.0 - distance 
                metadata["similarity_score"] = similarity
                
                documents.append(Document(page_content=doc_text, metadata=metadata))

        return documents


# -----------------------------------------------------------------------------
# Singletons
# -----------------------------------------------------------------------------
short_term_memory = ShortTermMemory()
long_term_memory = LongTermMemory()