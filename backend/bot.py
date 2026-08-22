from pipelines import storage_pipeline, retrieval_pipeline, private_agent_pipeline
from memory.storage import get_chat
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
            print(">>> Private Agent Pipeline")
            response = private_agent_pipeline.process_private_message(chat_id, text, user_name)
            if response and "text" in response:
                return response["text"]
            return None
        
        # Route 2: Private Chat between standard users
        if chat_type == "private" and chat_name != "TreamAI Agent":
            print(">>> Private Chat (User to User) - Agent ignoring")
            return None

        # Route 3: Team Space
        if is_mentioned or is_query:
            query = text.lstrip("?").replace("@agent", "").strip()
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