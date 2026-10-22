"""
RAG Retrieval Strategy Tests.
Validates Cosine Similarity and MMR retrieval strategies.
"""

import pytest
from unittest.mock import MagicMock
from langchain_core.documents import Document

from app.ai.rag.strategies import (
    CosineSimilarityStrategy,
    MMRStrategy,
)


@pytest.fixture
def mock_vectorstore():
    """Create a mock Chroma vectorstore."""
    store = MagicMock()
    
    # Mock similarity_search
    store.similarity_search = MagicMock(return_value=[
        Document(page_content="Doc 1", metadata={"id": "1"}),
        Document(page_content="Doc 2", metadata={"id": "2"}),
    ])
    
    # Mock max_marginal_relevance_search
    store.max_marginal_relevance_search = MagicMock(return_value=[
        Document(page_content="Diverse Doc 1", metadata={"id": "3"}),
        Document(page_content="Diverse Doc 2", metadata={"id": "4"}),
    ])
    
    return store


def test_cosine_similarity_strategy(mock_vectorstore):
    """Test Cosine Similarity retrieval returns top-k similar documents."""
    strategy = CosineSimilarityStrategy()
    
    results = strategy.retrieve(mock_vectorstore, "test query", k=2)
    
    assert len(results) == 2
    assert results[0].page_content == "Doc 1"
    assert results[1].page_content == "Doc 2"
    
    mock_vectorstore.similarity_search.assert_called_once_with("test query", k=2)


def test_mmr_strategy(mock_vectorstore):
    """Test MMR retrieval returns diverse documents."""
    strategy = MMRStrategy()
    
    results = strategy.retrieve(mock_vectorstore, "test query", k=2)
    
    assert len(results) == 2
    assert results[0].page_content == "Diverse Doc 1"
    assert results[1].page_content == "Diverse Doc 2"
    
    # Verify MMR-specific parameters
    mock_vectorstore.max_marginal_relevance_search.assert_called_once_with(
        "test query", k=2, fetch_k=20, lambda_mult=0.5
    )


def test_strategy_interface_compatibility(mock_vectorstore):
    """Test that both strategies implement the same interface."""
    strategies = [CosineSimilarityStrategy(), MMRStrategy()]
    
    for strategy in strategies:
        # Both should have a retrieve method
        assert hasattr(strategy, 'retrieve')
        
        # Both should return a list of Documents
        results = strategy.retrieve(mock_vectorstore, "query", k=2)
        assert isinstance(results, list)
        assert all(isinstance(doc, Document) for doc in results)