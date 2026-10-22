"""
LangGraph Agent Nodes.
Defines the logic steps for the autonomous agent execution engine.
"""

import logging
from typing import Any

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from app.ai.clients import get_default_llm, get_embeddings
from app.ai.memory import long_term_memory, short_term_memory

logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------------
# Prompt Templates
# -----------------------------------------------------------------------------
RAG_PROMPT_TEMPLATE = """You are Project NEXUS, an elite AI assistant.
Use the following context to answer the user's question. 
If the context doesn't contain relevant information, say so clearly.

Context:
{context}

User Question: {question}
"""

# -----------------------------------------------------------------------------
# Node Definitions
# -----------------------------------------------------------------------------

def retrieve_node(state: dict[str, Any]) -> dict[str, Any]:
    """
    Retrieves relevant context from LongTermMemory (ChromaDB) based on the latest user message.
    Updates the state with the retrieved 'context'.
    """
    messages: list[BaseMessage] = state.get("messages", [])
    if not messages:
        return {"context": []}

    # Get the last human message
    last_human_msg = next((m for m in reversed(messages) if isinstance(m, HumanMessage)), None)
    if not last_human_msg:
        return {"context": []}

    query = last_human_msg.content
    logger.info(f"Retrieving context for query: {query[:50]}...")

    # 1. Embed the query using our singleton HuggingFace model
    embeddings_model = get_embeddings()
    query_embedding = embeddings_model.embed_query(query)

    # 2. Search ChromaDB
    relevant_docs = long_term_memory.search_with_embeddings(query_embedding, k=3)
    
    logger.info(f"Retrieved {len(relevant_docs)} relevant documents.")
    return {"context": relevant_docs}


def generate_node(state: dict[str, Any]) -> dict[str, Any]:
    """
    Generates an AI response using the LLM, incorporating the retrieved context and conversation history.
    Updates the state with the new AI message.
    """
    messages: list[BaseMessage] = state.get("messages", [])
    context_docs: list = state.get("context", [])

    # Format context
    context_str = "\n\n".join([doc.page_content for doc in context_docs]) if context_docs else "No specific context available."

    # Get the last human question for the prompt
    last_human_msg = next((m for m in reversed(messages) if isinstance(m, HumanMessage)), None)
    question = last_human_msg.content if last_human_msg else ""

    # Construct the prompt
    prompt = ChatPromptTemplate.from_messages([
        ("system", RAG_PROMPT_TEMPLATE),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}"),
    ])

    # Prepare inputs
    # We use the short_term_memory for the full chat history to maintain continuity
    chat_history = short_term_memory.get_messages()
    
    # Note: For a pure LangGraph implementation, we would rely solely on the state['messages'].
    # However, since we are integrating with our custom memory layer, we use the short_term_memory 
    # for the history placeholder to ensure persistence across graph invocations if needed.
    # For this task, we will use the state messages directly to keep the graph pure.
    
    chain = prompt | get_default_llm()
    
    try:
        response = chain.invoke({
            "context": context_str,
            "question": question,
            "chat_history": messages[:-1]  # Exclude the current human message from history placeholder
        })
        
        ai_message = AIMessage(content=response.content)
        logger.info(f"Generated response: {ai_message.content[:50]}...")
        
        return {"messages": [ai_message]}
    except Exception as e:
        logger.error(f"LLM generation failed: {e}", exc_info=True)
        error_msg = AIMessage(content="I encountered an error processing your request. Please try again.")
        return {"messages": [error_msg]}
