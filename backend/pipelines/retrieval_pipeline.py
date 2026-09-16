from memory import storage, chroma
from llm import gemini
import time

def calculate_multi_factor_score(node, semantic_score, weights, max_access, current_time):
    """
    Calculate the composite retrieval score for a node using adaptive weights.
    """
    # Recency score
    days_old = (current_time - node.get("timestamp", 0)) / 86400.0
    recency_score = 1.0 / (1.0 + max(0, days_old))
    
    # Frequency score
    frequency_score = node.get("access_count", 0) / float(max_access)
    
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
    
    # Infer types based on query
    inferred_types = gemini.classify_query_types(query)
    
    # Track candidate nodes in a dict by ID to deduplicate
    candidates = {}
    
    # Path 1: Process semantic results
    if semantic_results and semantic_results["documents"] and len(semantic_results["documents"]) > 0:
        docs = semantic_results["documents"][0]
        metadatas = semantic_results["metadatas"][0]
        distances = semantic_results["distances"][0] if "distances" in semantic_results else []
        ids = semantic_results["ids"][0]
        
        for i in range(len(docs)):
            node = metadatas[i].copy()
            node["id"] = ids[i]
            node["content"] = docs[i]
            
            # Distance in cosine space
            distance = distances[i] if i < len(distances) else 1.0
            semantic_score = max(0.0, 1.0 - distance)
            node["semantic_score"] = semantic_score
            candidates[node["id"]] = node
            
    # Path 2 & 3: Recency and Frequency Search (Typed)
    typed_nodes = []
    if inferred_types:
        try:
            type_data = chroma.metadata_fetch(chat_id, project_id="", inferred_types=inferred_types)
            if type_data and type_data["documents"]:
                for i in range(len(type_data["documents"])):
                    n = type_data["metadatas"][i].copy()
                    n["id"] = type_data["ids"][i]
                    n["content"] = type_data["documents"][i]
                    typed_nodes.append(n)
        except Exception:
            pass
            
    # Top 10 by Recency
    recent_nodes = sorted(typed_nodes, key=lambda x: x.get("timestamp", 0), reverse=True)[:10]
    for n in recent_nodes:
        if n["id"] not in candidates:
            n["semantic_score"] = 0.0
            candidates[n["id"]] = n
            
    # Top 10 by Frequency
    frequent_nodes = sorted(typed_nodes, key=lambda x: x.get("access_count", 0), reverse=True)[:10]
    for n in frequent_nodes:
        if n["id"] not in candidates:
            n["semantic_score"] = 0.0
            candidates[n["id"]] = n
            
    # 3. Score all project-level candidates
    scored_nodes = []
    
    current_time = time.time()
    max_access = max((n.get("access_count", 0) for n in candidates.values()), default=1)
    if max_access == 0:
        max_access = 1
        
    for node_id, node in candidates.items():
        final_score = calculate_multi_factor_score(node, node.get("semantic_score", 0.0), weights, max_access, current_time)
        scored_nodes.append((final_score, node))
            
    # Sort project nodes by score descending
    scored_nodes.sort(key=lambda x: x[0], reverse=True)
    top_nodes = [n[1] for n in scored_nodes[:5]] # Take top 5
    
    # Path 4: Separate Chat-Level Fetch
    chat_candidates = []
    try:
        chat_data = chroma.metadata_fetch(chat_id, project_id="", inferred_types=["team_convention", "team_preference"])
        if chat_data and chat_data["documents"]:
            max_access = max((m.get("access_count", 0) for m in chat_data["metadatas"]), default=1)
            now = time.time()
            
            for i in range(len(chat_data["documents"])):
                meta = chat_data["metadatas"][i].copy()
                days_old = (now - meta.get("timestamp", 0)) / 86400
                recency_score = 1 / (1 + days_old)
                frequency_score = meta.get("access_count", 0) / max_access
                
                chat_score = (0.4 * recency_score) + (0.6 * frequency_score)
                
                n = meta.copy()
                n["id"] = chat_data["ids"][i]
                n["content"] = chat_data["documents"][i]
                chat_candidates.append({
                    "node": n,
                    "score": chat_score
                })
    except Exception:
        pass
        
    chat_candidates.sort(key=lambda x: x["score"], reverse=True)
    top_m_chat = [c["node"] for c in chat_candidates[:3]] # Take Top 3
    
    final_context = top_nodes + top_m_chat
    
    # 2. LLM Generation
    chat_history = storage.get_chat_history(chat_id, limit=6)
    # Exclude the current query from history as it's passed separately
    if chat_history and chat_history[-1]["text"] == query:
        chat_history = chat_history[:-1]
        
    raw_response_text = gemini.generate_response(query, project_nodes=top_nodes, chat_nodes=top_m_chat, chat_history=chat_history)
    
    # Parse the USED: [id] array from the response and strip it
    import re
    cited_ids = []
    match = re.search(r"USED:\s*\[(.*?)\]", raw_response_text)
    if match:
        ids_str = match.group(1)
        cited_ids = [i.strip() for i in ids_str.split(",") if i.strip()]
        
    # Strip the USED string from the final text sent to the user
    response_text = re.sub(r"USED:\s*\[.*?\]", "", raw_response_text).strip()
    
    # 3. LLM Self Evaluation & Weight Update for Project Nodes
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
            
            if len(eval_scores) > 0:
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
                
    # Update access count in Chroma for all cited nodes in final_context
    for node in final_context:
        if node["id"] in cited_ids or node in top_nodes: # Fallback to update top_nodes anyway to maintain frequency
            new_count = node.get("access_count", 0) + 1
            chroma.update_access(chat_id, node["id"], new_count, str(int(time.time())))
            
    return {
        "text": response_text
    }
