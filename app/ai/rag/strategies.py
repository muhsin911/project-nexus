"""
RAG Retrieval Strategies.
Implements the Strategy Pattern for swappable document retrieval algorithms.
"""

from abc import ABC, abstractmethod

from langchain_chroma import Chroma
from langchain_core.documents import Document


class RetrievalStrategy(ABC):
    """Abstract base class for retrieval strategies."""

    @abstractmethod
    def retrieve(self, vectorstore: Chroma, query: str, k: int) -> list[Document]:
        """
        Retrieve documents based on the specific strategy.
        
        Args:
            vectorstore: The LangChain Chroma vectorstore instance.
            query: The user's search query.
            k: Number of documents to return.
            
        Returns:
            List of retrieved LangChain Document objects.
        """
        pass


class CosineSimilarityStrategy(RetrievalStrategy):
    """
    Standard Cosine Similarity retrieval.
    Returns the top-k most semantically similar documents.
    """

    def retrieve(self, vectorstore: Chroma, query: str, k: int) -> list[Document]:
        return vectorstore.similarity_search(query, k=k)


class MMRStrategy(RetrievalStrategy):
    """
    Maximal Marginal Relevance (MMR) retrieval.
    Balances relevance to the query with diversity among the retrieved documents,
    preventing redundant information in the RAG context.
    """

    def retrieve(self, vectorstore: Chroma, query: str, k: int) -> list[Document]:
        # fetch_k: Number of documents to fetch initially before applying MMR
        # lambda_mult: Controls diversity (1.0 = max diversity, 0.0 = max similarity)
        return vectorstore.max_marginal_relevance_search(
            query, k=k, fetch_k=20, lambda_mult=0.5
        )