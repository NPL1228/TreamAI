import json
import os

from google import genai
from google.genai import types

_client = None


def get_client():

    global _client

    if _client is None:

        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise RuntimeError("GEMINI_API_KEY not found")

        _client = genai.Client(api_key=api_key)

    return _client

def summarize_messages(messages, current_projects):

    client = get_client()

    msgs_text = "\n".join(
        f"[{m['timestamp']}] {m['user_name']}: {m['message']}"
        for m in messages
    )

    projects = ", ".join(
        p["name"] for p in current_projects
    ) or "None"

    prompt = f"""
You are Teamora.

Current Projects:
{projects}

Messages:
{msgs_text}

Extract memory nodes from the conversation.
IMPORTANT: If the messages describe or discuss a NEW project that is NOT already in the Current Projects list, you MUST set "new_project_detected" to true and provide a short, descriptive "suggested_name" for it.

Return ONLY JSON.

{{
    "nodes":[
        {{
            "type":"",
            "project_id":"",
            "content":""
        }}
    ],
    "unknown":[],
    "new_project_detected":false,
    "suggested_name":null
}}
"""

    try:

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        print("=" * 60)
        print("Gemini Raw Response")
        print(response.text)
        print("=" * 60)

        return json.loads(response.text)

    except json.JSONDecodeError:

        print("Invalid JSON from Gemini")

    except Exception as e:

        print("Gemini Error:", e)

    return {
        "nodes": [],
        "unknown": [],
        "new_project_detected": False,
        "suggested_name": None
    }

def generate_response(query: str, nodes: list) -> str:
    """
    Generate a response to the user's query using retrieved memory nodes.
    Also cites which nodes were used.
    """
    client = get_client()
    
    context_text = ""
    for node in nodes:
        context_text += f"- [ID: {node['id']}] ({node['type']}): {node['content']}\n"
        
    prompt = f"""
    You are a helpful AI assistant.
    
    Context Memories:
    {context_text}
    
    User Query: {query}
    
    Generate a response using the context provided.
    At the very end of your response, on a new line, you MUST list the exact memory IDs you used to form your response in this format:
    USED: [id1, id2]
    """
    
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt
    )
    return response.text

def classify_private_message(message: str, current_projects: list):
    client = get_client()

    projects = ", ".join(
        f"{p['name']} (ID: {p['project_id']})" for p in current_projects
    ) or "None"

    prompt = f"""
You are Teamora Agent in a private 1-on-1 chat with a user.
Your job is to classify their message into one of three intents:
1. Query: the user is asking a question or requesting information.
2. Correction: the user is correcting an existing memory or fact.
3. Statement: the user is stating a fact to be stored.

Current Projects in their space:
{projects}

User Message:
{message}

If the intent is a Statement, classify it into one of the following types: project_task, project_decision, project_progress, project_issue, team_convention, team_preference.
If it belongs to a project, provide the matching project_id, else null.
Also provide the exact content to store or the correction to make.

Return ONLY a JSON object in this format:
{{
  "intent": "Query" | "Correction" | "Statement",
  "type": "project_task" | null,
  "project_id": "proj_123" | null,
  "content": "The concise fact to store or query to run or correction to make."
}}
"""

    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.0
        )
    )

    try:
        result = json.loads(response.text)
    except Exception as e:
        print("Failed to parse JSON:", response.text)
        result = {
            "intent": "Query",
            "type": None,
            "project_id": None,
            "content": message
        }
    return result


def evaluate_memory_nodes(query: str, response: str, nodes: list) -> dict:
    """
    Evaluate the usefulness of retrieved nodes for the generated response.
    Returns JSON with scores from 1-5.
    """
    client = get_client()
    
    context_text = ""
    for node in nodes:
        context_text += f"- [ID: {node['id']}] {node['content']}\n"
        
    prompt = f"""
    Given this user query:
    "{query}"
    
    And this response you generated:
    "{response}"
    
    Rate each of these memory nodes from 1-5 on how useful it was for generating the response:
    5 = essential, directly used
    4 = helpful, influenced the response
    3 = somewhat relevant, minor influence
    2 = retrieved but not useful
    1 = completely irrelevant
    
    Memory Nodes:
    {context_text}
    
    Return JSON ONLY in this format:
    {{
      "node_id": score,
      ...
    }}
    """
    
    resp = client.models.generate_content(
        model='gemini-2.5-flash', # use smaller model for evaluation
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        )
    )
    
    try:
        return json.loads(resp.text)
    except:
        return {}
