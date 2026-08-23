from memory import storage, chroma
from llm import gemini
import time

def calculate_multi_factor_score(node, semantic_score, weights):
    """
    Calculate the composite retrieval score for a node using adaptive weights.
    w1: semantic similarity, w2: recency, w3: frequency
    """
    # Recency score (normalized somewhat)
    age_seconds = int(time.time()) - node.get("timestamp", 0)
    # Give higher score to newer nodes (exponential decay)
    import math
    recency_score = math.exp(-age_seconds / 86400) # Decay over days
    
    # Frequency score (normalized)
    access_count = node.get("access_count", 0)
    frequency_score = 1.0 - (1.0 / (access_count + 1))
    
    return (weights["w1"] * semantic_score) + \
           (weights["w2"] * recency_score) + \
           (weights["w3"] * frequency_score)


def retrieve_and_respond(chat_id: str, query: str) -> dict:
    """
    Retrieval workflow triggered when the agent is @mentioned.
    """
    weights = storage.get_weights(chat_id)
    
    # 1. Semantic Search
    semantic_results = chroma.semantic_search(chat_id, query, project_id="", n_results=10)
    
    scored_nodes = []
    
    # Process semantic results
    if semantic_results and semantic_results["documents"] and len(semantic_results["documents"]) > 0:
        docs = semantic_results["documents"][0]
        metadatas = semantic_results["metadatas"][0]
        distances = semantic_results["distances"][0] if "distances" in semantic_results else []
        ids = semantic_results["ids"][0]
        
        for i in range(len(docs)):
            node = metadatas[i].copy()
            node["id"] = ids[i]
            node["content"] = docs[i]
            
            # Distance in cosine space (Chroma returns distance, we want similarity 1 - distance)
            distance = distances[i] if i < len(distances) else 1.0
            semantic_score = max(0.0, 1.0 - distance)
            
            final_score = calculate_multi_factor_score(node, semantic_score, weights)
            scored_nodes.append((final_score, node))
            
    # Sort nodes by score descending
    scored_nodes.sort(key=lambda x: x[0], reverse=True)
    top_nodes = [n[1] for n in scored_nodes[:5]] # Take top 5
    
    # 2. LLM Generation
    chat_history = storage.get_chat_history(chat_id, limit=6)
    # Exclude the current query from history as it's passed separately
    if chat_history and chat_history[-1]["text"] == query:
        chat_history = chat_history[:-1]
        
    raw_response_text = gemini.generate_response(query, top_nodes, chat_history)
    
    # Parse the USED: [id] array from the response and strip it
    import re
    cited_ids = []
    match = re.search(r"USED:\s*\[(.*?)\]", raw_response_text)
    if match:
        ids_str = match.group(1)
        cited_ids = [i.strip() for i in ids_str.split(",") if i.strip()]
        
    # Strip the USED string from the final text sent to the user
    response_text = re.sub(r"USED:\s*\[.*?\]", "", raw_response_text).strip()
    
    # 3. LLM Self Evaluation & Weight Update
    if top_nodes:
        eval_scores = gemini.evaluate_memory_nodes(query, raw_response_text, top_nodes)
        
        # Calculate feedback signals
        if eval_scores:
            total_signal = 0
            for node_id, rating in eval_scores.items():
                citation_bonus = 1.0 if node_id in cited_ids else 0.0
                relevance_score = rating / 5.0
                # Formula from docs: signal = (citation_bonus + relevance_score) / 2
                node_signal = (citation_bonus + relevance_score) / 2.0
                total_signal += node_signal
            
            avg_signal = total_signal / len(eval_scores)
            
            # Simple weight update
            alpha = weights["alpha"]
            
            w1_new = (alpha * weights["w1"]) + ((1 - alpha) * avg_signal)
            w2_new = (alpha * weights["w2"]) + ((1 - alpha) * avg_signal)
            w3_new = (alpha * weights["w3"]) + ((1 - alpha) * avg_signal)
            
            # Normalize
            total = w1_new + w2_new + w3_new
            if total > 0:
                storage.update_weights(chat_id, w1_new/total, w2_new/total, w3_new/total)
                
        # Update access count in Chroma
        for node in top_nodes:
            new_count = node.get("access_count", 0) + 1
            chroma.update_access(chat_id, node["id"], new_count, str(int(time.time())))
            
    return {
        "text": response_text
    }
