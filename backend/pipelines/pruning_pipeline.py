import time
import traceback
from memory import storage, chroma

PRUNE_THRESHOLD = 14.0 

def run_adaptive_pruning(chat_id: str):
    print('=' * 60)
    print(f'RUNNING ADAPTIVE PRUNING FOR CHAT: {chat_id}')
    print('=' * 60)
    
    try:
        nodes_data = chroma.get_all_nodes(chat_id)
        if not nodes_data or not nodes_data.get('ids'):
            print('No memory nodes found to prune.')
            return
        
        ids = nodes_data['ids']
        metadatas = nodes_data['metadatas']
        
        current_time = int(time.time())
        nodes_to_delete = []
        
        for i in range(len(ids)):
            node_id = ids[i]
            meta = metadatas[i]
            timestamp = meta.get('timestamp', current_time)
            access_count = meta.get('access_count', 0)
            
            age_seconds = current_time - timestamp
            age_days = max(0, age_seconds / 86400.0)
            
            prune_score = age_days * (1.0 / (access_count + 1.0))
            
            if prune_score >= PRUNE_THRESHOLD:
                print(f'[PRUNE] Node {node_id} | Age: {age_days:.1f}d | Access: {access_count} | Score: {prune_score:.2f} >= {PRUNE_THRESHOLD}')
                nodes_to_delete.append(node_id)
        
        if nodes_to_delete:
            chroma.delete_nodes(chat_id, nodes_to_delete)
            print(f'Successfully pruned {len(nodes_to_delete)} memory nodes.')
        else:
            print('No nodes met the pruning threshold. Kept all nodes.')
            
    except Exception as e:
        print('Error during adaptive memory pruning:')
        traceback.print_exc()

def trigger_pruning_check(chat_id: str):
    run_adaptive_pruning(chat_id)

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        run_adaptive_pruning(sys.argv[1])
