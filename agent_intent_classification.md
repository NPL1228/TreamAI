# TreamAI Agent Intent Classification Architecture

The TreamAI Agent utilizes a lightweight LLM orchestration layer to dynamically classify what the user is trying to achieve. Because the agent serves different purposes depending on the context, the classification logic is split into two distinct environments: **Private Agent Chat** (1-on-1) and **Team Space Chat** (Group context).

---

## 1. Private Agent Chat (1-on-1)

When you message the "TreamAI Agent" directly in a private chat, the agent acts as your personal memory assistant. Every message you send is passed through `gemini.classify_private_message()` to determine if you are asking a question, teaching it a new fact, or fixing an old memory.

### Possible Intents

#### A. `Query` (Information Retrieval)
* **Trigger:** The user asks a question or requests information.
* **Example:** *"What is John's phone number?"* or *"What did we decide about the UI design?"*
* **Backend Action:** Routes to the standard `retrieval_pipeline`. The backend performs a Semantic Search against ChromaDB, retrieves relevant memories, and generates an answer based on your personal context.

#### B. `Statement` (Direct Memorization)
* **Trigger:** The user states a fact or piece of information to be remembered.
* **Example:** *"My new phone number is 555-1234"* or *"The project deadline was moved to Friday."*
* **Backend Action:** Bypasses the 5-message team buffer entirely. The backend instantly packages the text into a structured JSON memory node and embeds it directly into ChromaDB. The agent replies with a simple acknowledgment (e.g., *"Noted."*).

#### C. `Correction` (Memory Modification)
* **Trigger:** The user corrects a previously stated fact.
* **Example:** *"Actually, my phone number is 555-9999, not 1234."*
* **Backend Action:** The backend searches ChromaDB for the old memory that matches the context. Instead of creating a duplicate conflicting memory, it actively overwrites the content of the target node in the vector database and replies *"Got it, I've updated that."*

---

## 2. Team Space Chat (`@agent` Mentions)

In a group setting, the agent acts as a passive observer until explicitly summoned using `@agent` or `?`. When summoned, it passes the query through `gemini.classify_team_query()` to route the request efficiently, saving tokens and database processing power.

### Possible Intents

#### A. `summarization` (Context Recap)
* **Trigger:** The user asks to summarize the recent conversation, catch up, or recap the current chat context.
* **Example:** *"@agent can you summarize what the team just talked about?"* or *"@agent what did I miss?"*
* **Backend Action:** **Bypasses ChromaDB.** The backend fetches the last 20 messages directly from the SQLite relational database history and feeds them to Gemini to generate an instant recap. This prevents unnecessary vector searches.

#### B. `general_qa` (General Knowledge / Casual)
* **Trigger:** A general knowledge question, coding question, or casual greeting that does NOT require team memory.
* **Example:** *"@agent how do you reverse a string in Python?"* or *"@agent hello!"*
* **Backend Action:** **Bypasses ChromaDB AND SQLite.** The backend asks the LLM directly without attaching any database context. This provides the absolute fastest response time and minimizes API token usage.

#### C. `retrieval` (Deep Memory Search)
* **Trigger:** Asking about past project details, past decisions, facts, or specific team memories.
* **Example:** *"@agent what did John decide about the server architecture yesterday?"*
* **Backend Action:** Routes to the full `retrieval_pipeline`. The backend performs a Semantic Search in ChromaDB, applies the Exponential Moving Average (EMA) multi-factor weights (Semantic + Recency + Frequency), generates the response, runs the self-evaluation, and updates the memory importance scores.

---

### Architecture Summary

| Context | Pipeline Router | Available Intents | Action |
|---------|-----------------|-------------------|--------|
| **Private** | `private_agent_pipeline.py` | `Query` | Vector Search (ChromaDB) |
| **Private** | `private_agent_pipeline.py` | `Statement` | Direct Insert (ChromaDB) |
| **Private** | `private_agent_pipeline.py` | `Correction` | Search & Overwrite (ChromaDB) |
| **Team** | `bot.py` | `retrieval` | Vector Search + Weights (ChromaDB) |
| **Team** | `bot.py` | `summarization` | History Fetch (SQLite) |
| **Team** | `bot.py` | `general_qa` | Direct LLM Generation (None) |
