import uuid
import time
import traceback

from memory import storage, chroma
from llm import gemini

# Number of buffered messages before summarization
BUFFER_LIMIT = 5      # Change to 1 later if desired


def process_incoming_message(chat_id: str, message: str, user_name: str):

    print("=" * 60)
    print("NEW MESSAGE")
    print(f"Chat : {chat_id}")
    print(f"User : {user_name}")
    print(f"Text : {message}")
    print("=" * 60)

    storage.buffer_message(chat_id, message, user_name)

    messages = storage.get_buffered_messages(chat_id)

    print(f"Buffered messages: {len(messages)} / {BUFFER_LIMIT}")

    if len(messages) < BUFFER_LIMIT:
        return None

    try:
        return summarize_and_store(chat_id, messages)

    except Exception:
        print("Storage pipeline crashed")
        traceback.print_exc()

        return {
            "text": "Storage pipeline failed."
        }


def summarize_and_store(chat_id: str, messages: list):

    start_time = time.time()
    print("\nSummarizing messages...")
    
    # Improvement 13: Reduce prompt size by ensuring we never send more than the last 20 messages
    messages = messages[-20:]

    projects = storage.get_projects(chat_id)

    result = gemini.summarize_messages(messages, projects)

    print("Gemini returned:")
    print(result)

    nodes = result.get("nodes", [])

    current_time = int(time.time())

    for node in nodes:

        try:

            node_record = {
                "id": str(uuid.uuid4()),
                "content": node.get("content", ""),
                "chat_id": chat_id,
                "project_id": node.get("project_id") or "",
                "type": node.get("type", "unknown"),
                "timestamp": current_time,
                "speaker": ""
            }

            chroma.store_node(chat_id, node_record)

        except Exception:
            traceback.print_exc()

    storage.clear_buffer(chat_id)

    if result.get("new_project_detected"):

        suggested = result.get("suggested_name") or "New Project"
        
        print(f"Summarization took {time.time() - start_time:.2f}s")

        return {
            "text": f"It looks like you're discussing a new project. Should I create **{suggested}** as a new project?\n\n[[Yes|?ACTION:create_project:{suggested}]] [[No|?ACTION:ignore_project]]"
        }

    print(f"Summarization took {time.time() - start_time:.2f}s")
    print("No new project detected.")

    return None


def handle_action(chat_id: str, action_name: str, parameters: dict):

    print(f"Action: {action_name}")

    if action_name == "create_project":

        project_name = parameters.get("project_name", "New Project")

        project_id = str(uuid.uuid4())

        storage.register_project(
            project_id,
            chat_id,
            project_name
        )

        return {
            "text": f"Project '{project_name}' created successfully."
        }

    if action_name == "ignore_project":

        return {
            "text": "Project ignored."
        }

    return None