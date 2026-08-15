import uuid
import time
from llm import gemini
from memory import storage, chroma
from pipelines import retrieval_pipeline

def process_private_message(chat_id: str, message: str, username: str):
    print("=" * 60)
    print("PRIVATE AGENT PIPELINE")
    print(f"Chat : {chat_id}")
    print(f"User : {username}")
    print(f"Text : {message}")
    print("=" * 60)

    # 1. Fetch current projects
    projects = storage.get_projects(chat_id)
    
    # 2. Classify intent
    classification = gemini.classify_private_message(message, projects)
    intent = classification.get("intent", "Query")
    content = classification.get("content", message)
    node_type = classification.get("type")
    project_id = classification.get("project_id")

    print(f"Intent classified as: {intent}")
    
    if intent == "Query":
        print("Routing to retrieval pipeline...")
        return retrieval_pipeline.retrieve_and_respond(chat_id, content)

    elif intent == "Statement":
        if not node_type or node_type == "IGNORE":
            return {"text": "Noted."}
        
        # Ensure project_id is valid or None
        if project_id and not any(p["project_id"] == project_id for p in projects):
            project_id = None
            
        new_node = {
            "id": str(uuid.uuid4()),
            "content": content,
            "chat_id": chat_id,
            "project_id": project_id,
            "type": node_type,
            "speaker": username,
            "timestamp": int(time.time()),
        }
        
        chroma.store_node(chat_id, new_node)
        print("Stored new node immediately.")
        return {"text": "Noted."}

    elif intent == "Correction":
        print("Processing correction...")
        # Find related node
        search_results = chroma.semantic_search(chat_id, content, project_id=project_id, n_results=1)
        
        if search_results and search_results["ids"] and search_results["ids"][0]:
            target_id = search_results["ids"][0][0]
            success = chroma.update_node_content(chat_id, target_id, content)
            if success:
                print(f"Updated node {target_id}")
                return {"text": "Got it, I've updated that."}
            else:
                return {"text": "I couldn't update the memory."}
        else:
            return {"text": "I couldn't find a related memory to correct."}
    
    return {"text": "I'm not sure how to handle that."}
