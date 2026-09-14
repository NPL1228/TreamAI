# Unimplemented Features & Pending Improvements

A reference list of all features and schema changes discussed that are not yet reflected in the codebase.

---

## AI / Retrieval Pipeline

### 1. Project-Level Weight Routing
**What should happen:** When the retrieval pipeline fetches top-K nodes, it should inspect the `project_id` metadata of those nodes, determine which project they mostly belong to, and load that project's specific `w1 / w2 / w3` weights from the `Weights` table for scoring.

**What happens now:** `retrieve_and_respond()` always calls `get_weights(chat_id)` with no `project_id`. Only the chat-level weight row is ever read or updated. All projects inside a chat share the same weights and never develop independent retrieval behaviour.

---

### 2. Weight Initialization on Chat / Project Creation
**What should happen:**
- When `create_chat()` is called → automatically insert a default `Weights` row with `project_id = NULL`.
- When `register_project()` is called → automatically insert a default `Weights` row with the new `project_id`.

**What happens now:** Neither function touches the `Weights` table. Chat-level weights are lazily created only on the first `@agent` retrieval call. Project weights are never created at all.

---

## Adaptive Pruning

### 3. True Hybrid Pruning Trigger
**What should happen:** Pruning fires on two independent axes:
- **Daily timer** — a scheduled background job runs a pruning sweep every 24 hours regardless of chat activity.
- **Emergency count threshold** — if the total number of ChromaDB nodes for a chat exceeds a configured limit, an immediate prune is triggered.

**What happens now:** Pruning is purely count-based, piggybacking on the storage pipeline's `BUFFER_LIMIT = 5`. It fires every time 5 messages are processed — not on a timer, and not based on actual ChromaDB node count.

---

### 4. LLM Node Consolidation
**What should happen:** Nodes whose `prune_score` falls between `consolidate_threshold (0.5)` and `discard_threshold (0.8)` should be passed to Gemini to be semantically merged with similar nodes into a single denser summary node.

**What happens now:** Nodes that hit the consolidation threshold are flagged and logged (`nodes_to_consolidate` list) but no LLM call is made and no merging occurs. The nodes remain untouched in ChromaDB.

---

### 5. Pruning Feedback to Adaptive Weights
**What should happen:**
- When a node is **discarded**, the retrieval path (`w1 / w2 / w3`) that consistently surfaced it should be slightly penalized in the `Weights` table.
- When a **consolidated** node subsequently receives frequent accesses, the pruning aggressiveness for that project should be reinforced.

**What happens now:** The pruning pipeline deletes nodes from ChromaDB with no feedback signal sent back to the `Weights` table. The two systems are completely disconnected.

---

## Database Schema

### 6. Message_Buffer — Normalize to Foreign Key
**What should happen:** Instead of storing the full message text in `Message_Buffer`, the table should store a `message_id` FK referencing `Messages(id)` alongside `chat_id`. This eliminates duplicate text storage.

**Proposed schema:** `id` · `message_id (FK → Messages.id)` · `chat_id`

**What exists now:** `id` · `chat_id` · `message` (full text) · `user_name` · `timestamp` — the same text lives simultaneously in both `Messages` and `Message_Buffer`.

---

### 7. Friendships — Merge Nicknames into Friendship Row
**What should happen:** The separate `Friend_Nicknames` table should be eliminated. Two nullable nickname columns (`nickname1`, `nickname2`) should be added directly to the `Friendships` table, where `nickname1` = what `user1` calls `user2`, and `nickname2` = what `user2` calls `user1`.

**Proposed schema:** `friend_id (PK)` · `user1 (FK)` · `user2 (FK)` · `nickname1` · `nickname2` · `status` · `created_at`

**What exists now:** Nicknames are stored in a separate `Friend_Nicknames` table requiring an extra JOIN to resolve.

---

## Notes
- Items **1 and 2** are tightly coupled — project weight routing only becomes useful once weights are properly seeded at project creation.
- Items **3, 4, and 5** together complete the full adaptive pruning lifecycle as documented in the FYP thesis.
- Items **6 and 7** are schema normalization improvements and do not affect AI behaviour.
