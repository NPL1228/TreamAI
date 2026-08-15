import chromadb
from chromadb.config import Settings

client = chromadb.PersistentClient(path="./chroma_db")


def get_collection(chat_id: str):
    """Get or create a ChromaDB collection for a chat."""
    safe_chat_id = chat_id.replace("/", "_")
    return client.get_or_create_collection(
        name=f"chat_{safe_chat_id}",
        metadata={"hnsw:space": "cosine"}
    )


def store_node(chat_id: str, node: dict):
    """Store a memory node into ChromaDB."""
    collection = get_collection(chat_id)
    collection.add(
        ids=[node["id"]],
        documents=[node["content"]],
        metadatas=[{
            "chat_id":      node["chat_id"],
            "project_id":   node.get("project_id", ""),
            "type":         node["type"],
            "speaker":      node.get("speaker", ""),
            "timestamp":    node["timestamp"],
            "access_count": 0,
            "last_accessed": "",
            "pool":         "active",
        }]
    )


def semantic_search(chat_id: str, query: str,
                    project_id: str, n_results: int = 20):
    """Semantic path — no type filter."""
    collection = get_collection(chat_id)
    return collection.query(
        query_texts=[query],
        n_results=n_results,
        where={"project_id": project_id}
    )


def metadata_fetch(chat_id: str, project_id: str,
                   inferred_types: list):
    """Fetch nodes for recency and frequency path sorting."""
    collection = get_collection(chat_id)
    return collection.get(
        where={
            "project_id": project_id,
            "type": {"$in": inferred_types}
        }
    )


def update_access(chat_id: str, node_id: str,
                  access_count: int, last_accessed: str):
    """Update access metadata after retrieval."""
    collection = get_collection(chat_id)
    collection.update(
        ids=[node_id],
        metadatas=[{
            "access_count": access_count,
            "last_accessed": last_accessed
        }]
    )

def update_node_content(chat_id: str, node_id: str, new_content: str):
    """Update node content and metadata."""
    collection = get_collection(chat_id)
    # Chroma requires re-providing all metadata if we just update documents, 
    # but we can get it first.
    existing = collection.get(ids=[node_id])
    if existing and existing["ids"]:
        metadata = existing["metadatas"][0]
        collection.update(
            ids=[node_id],
            documents=[new_content],
            metadatas=[metadata]
        )
        return True
    return False
