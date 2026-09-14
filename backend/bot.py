from pipelines import storage_pipeline, retrieval_pipeline, private_agent_pipeline
from memory.storage import get_chat, get_chat_history
from llm import gemini
import traceback

async def handle_message(chat_id: str, text: str, user_name: str):
    print("=" * 50)
    print("Storage/Retrieval Decision")
    print("=" * 50)
    print("Chat :", chat_id)
    print("User :", user_name)
    print("Text :", text)

    try:
        chat = get_chat(chat_id)
        if not chat:
            return None

        # Check AI Listening Toggle
        if not chat.get("ai_listening", 1):
            print(">>> AI is not listening in this chat. Ignoring.")
            return None

        is_mentioned = "@agent" in text.lower()
        is_query = text.strip().startswith("?")

        chat_type = chat["chat_type"]
        chat_name = chat["chat_name"]

        # Route 1: Private Chat with TreamAI Agent
        if chat_type == "private" and chat_name == "TreamAI Agent":
            print(">>> Private Agent Chat (Intent Classification)")
            response = private_agent_pipeline.process_private_message(chat_id, text, user_name)
            if response and "text" in response:
                return response["text"]
            return None
        
        # Route 2: Team Space / Normal Private Chat
        
        # Check for inline action commands triggered by buttons
        if text.startswith("?ACTION:"):
            action_str = text.replace("?ACTION:", "").strip()
            parts = action_str.split(":", 1)
            action_name = parts[0]
            params = {}
            if len(parts) > 1:
                params["project_name"] = parts[1]
                
            print(f">>> Action Pipeline: {action_name}")
            response = storage_pipeline.handle_action(chat_id, action_name, params)
            if response and "text" in response:
                return response["text"]
            return None
            
        if is_mentioned or is_query:
            query = text.lstrip("?").replace("@agent", "").strip()
            
            print(">>> Orchestrating Query Intent...")
            intent = gemini.classify_team_query(query)
            print(f">>> Intent Detected: {intent}")
            
            if intent == "summarization":
                print(">>> Summarization Pipeline (No Retrieval)")
                recent_msgs = get_chat_history(chat_id, limit=20)
                if recent_msgs and recent_msgs[-1]["text"] == text:
                    recent_msgs = recent_msgs[:-1]
                response_text = gemini.generate_response(query, [], recent_msgs)
                return response_text
                
            elif intent == "general_qa":
                print(">>> General QA Pipeline (No Retrieval)")
                response_text = gemini.generate_response(query, [])
                return response_text
                
            else:
                print(">>> Retrieval Pipeline")
                response = retrieval_pipeline.retrieve_and_respond(chat_id, query)
                if response and "text" in response:
                    return response["text"]
                return None

        print(">>> Storage Pipeline")
        response = storage_pipeline.process_incoming_message(chat_id, text, user_name)
        if response and "text" in response:
            print("Returning response.")
            return response["text"]
            
        print("Buffered only.")
        return None

    except Exception:
        traceback.print_exc()
        return "⚠️ Internal server error."