"""
AI Client Singletons (LLM & Embeddings).
Provides thread-safe, cached instances of AI models to prevent connection
pool exhaustion and respect free-tier rate limits.
"""

import logging
from functools import lru_cache

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings

from app.core.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_groq_llm() -> ChatGroq:
    """
    Singleton Groq LLM client.
    Configured for low latency and strict timeout handling.
    """
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is missing. Set it in your .env file.")

    logger.info("Initializing Groq LLM client...")
    return ChatGroq(
        # llama-3.3-70b-versatile is currently the best free-tier model on Groq
        model="llama-3.3-70b-versatile",
        temperature=0.1,
        max_tokens=4096,
        timeout=20.0,
        max_retries=2,
        api_key=settings.GROQ_API_KEY,
    )


@lru_cache(maxsize=1)
def get_gemini_llm() -> ChatGoogleGenerativeAI:
    """
    Singleton Google Gemini LLM client.
    """
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is missing. Set it in your .env file.")

    logger.info("Initializing Gemini LLM client...")
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        temperature=0.1,
        max_output_tokens=4096,
        timeout=20.0,
        max_retries=2,
        google_api_key=settings.GEMINI_API_KEY,
    )


def get_default_llm() -> BaseChatModel:
    """
    Factory function to return the configured default LLM.
    Reads from settings.DEFAULT_LLM_PROVIDER ('groq' or 'gemini').
    """
    if settings.DEFAULT_LLM_PROVIDER == "gemini":
        return get_gemini_llm()
    return get_groq_llm()


@lru_cache(maxsize=1)
def get_embeddings() -> HuggingFaceEmbeddings:
    """
    Singleton HuggingFace Embeddings client.
    Uses a lightweight, high-performance model optimized for RAG.
    
    CRITICAL: Forces CPU execution (`device: cpu`) to ensure compatibility 
    with free-tier container environments that lack GPUs.
    Normalizes embeddings for optimal Cosine Similarity in ChromaDB.
    """
    logger.info(f"Initializing Embeddings model: {settings.EMBEDDING_MODEL}...")
    return HuggingFaceEmbeddings(
        model_name=settings.EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )