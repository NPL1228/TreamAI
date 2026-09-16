import time
import math
import traceback
from memory import storage, chroma

# Explicit configuration matching FYP Documentation (Exponential Decay Model)
PRUNING_CONFIG = {
    "discard_threshold": 0.8,        # prune_score above this -> delete
    "consolidate_threshold": 0.5,    # prune_score above this -> consolidate
    "decay_rate": 0.1,                # (λ) controls frequency decay speed
    "max_age_days": 30,               # denominator for age_factor
    "pruning_trigger": "hybrid",      # daily + emergency if node count > threshold
    "emergency_node_limit": 50        # triggers emergency prune if chat exceeds this
}

def run_adaptive_pruning(chat_id: str):
    print("=" * 60)
    print(f"RUNNING ADAPTIVE PRUNING FOR CHAT: {chat_id}")
    print("=" * 60)
    
    try:
        nodes_data = chroma.get_all_nodes(chat_id)
        if not nodes_data or not nodes_data.get("ids"):
            print("No memory nodes found to prune.")
            return
        
        ids = nodes_data["ids"]
        metadatas = nodes_data["metadatas"]
        
        current_time = int(time.time())
        nodes_to_delete = []
        nodes_to_consolidate = []
        
        for i in range(len(ids)):
            node_id = ids[i]
            meta = metadatas[i]
            
            timestamp = int(meta.get("timestamp", current_time))
            access_count = int(meta.get("access_count", 0))
            last_accessed = meta.get("last_accessed", "")
            
            if last_accessed == "":
                last_accessed_time = timestamp
            else:
                last_accessed_time = int(last_accessed)
            
            days_since_last_access = max(0, (current_time - last_accessed_time) / 86400.0)
            age_days = max(0, (current_time - timestamp) / 86400.0)
            
            # Math Formulas:
            # 1. Decay Factor = e^(-λ×days_since_last_access)
            decay_factor = math.exp(-PRUNING_CONFIG["decay_rate"] * days_since_last_access)
            # 2. Effective Frequency = access_count * decay_factor
            effective_freq = access_count * decay_factor
            # 3. Age Factor = min(age_days / max_age, 1.0)
            age_factor = min(age_days / PRUNING_CONFIG["max_age_days"], 1.0)
            # 4. Prune Score = age_factor * (1 / (effective_freq + 1))
            prune_score = age_factor * (1.0 / (effective_freq + 1.0))
            
            # Outcomes:
            if prune_score >= PRUNING_CONFIG["discard_threshold"]:
                print(f"[DISCARD] Node {node_id} | Score: {prune_score:.2f}")
                nodes_to_delete.append(node_id)
                # TODO: Link back to adaptive weight mechanism (to penalize path)
            elif prune_score >= PRUNING_CONFIG["consolidate_threshold"]:
                nodes_to_consolidate.append(node_id)
        
        if nodes_to_delete:
            chroma.delete_nodes(chat_id, nodes_to_delete)
            print(f"Successfully discarded {len(nodes_to_delete)} memory nodes.")
        else:
            print("No nodes met the discard threshold.")
            
        if nodes_to_consolidate:
            print(f"{len(nodes_to_consolidate)} nodes flagged for consolidation.")
            
    except Exception as e:
        traceback.print_exc()

def trigger_pruning_check(chat_id: str):
    if PRUNING_CONFIG["pruning_trigger"] in ["hybrid", "count-based"]:
        try:
            nodes_data = chroma.get_all_nodes(chat_id)
            if nodes_data and nodes_data.get("ids"):
                if len(nodes_data["ids"]) >= PRUNING_CONFIG["emergency_node_limit"]:
                    print(f"Emergency limit reached ({len(nodes_data['ids'])} >= {PRUNING_CONFIG['emergency_node_limit']}). Triggering prune.")
                    run_adaptive_pruning(chat_id)
        except Exception:
            pass

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        run_adaptive_pruning(sys.argv[1])
