# **Pipeline**
## Storage Pipeline
1. **User** sends message, backend keeps track of count and buffers the message.
2. Until the *N*th message (needs to finetune), backend sends to LLM for summarization
- Exception: agent is @ed, it will trigger retrieval workflow
- Exception: If agent detects a project/topic shift after a summarization event, prompts user whether it is new, for classification purposes [[#^306a67]]
3. Before summarization, LLM decide which info is important, then only summarize (or can direct summarize if LLM can ignore unimportant msg by itself)
4. After summarization, LLM sends result to backend, then backend saves to a memory database system (saves metadata, timestamp, vector embedding, accessed frequency) [[#^e56f18]]
## Retrieval Pipeline
1. User sends message that @ the agent
2. Backend detects @, directly runs multi-path (factors) retrieval from vector DB [[#^5014c4]]
3. Backend calculate composite score using the multi-factors formula from the retrieve memories
- each nodes calculated using their respective weight set (Chat/Project))
- weights are retrieved after detecting which nodes are being scored
4. Backend sends top-k results to LLM for generation (like traditional RAG)
5. LLM provides output
6. LLM calculates scores to evaluate memory importance [[#^89d144]]

*Backend may need to tag (Storage / Retrieval) in the message for LLM to identify purpose*

---
# **Self Adaptive Features** 
## Adaptive Weights
LLM auto finetune weights from the formula based on the usage of the retrieved output 
### Implementation
1. LLM cite the source of memory used to generate response with memory id
- Sample prompt: "After your response, list the memory IDs you used in format: USED: [id1, id2]"[[#^df78de]]
- Backend tag those memory as useful, track their source (which factor), then modify the weight (needs a formula on how to modify)
2. LLM self evaluation
- After response generation, LLM rate the importance / usefulness of all / some of the retrieved top-k memories
- extra cost per retrieval as LLM is called twice
3.  User feedback signal
- user reacts thumbs up or down / follow up clarification to indicate the usefulness of the response
- hard to collect real feedback for synthetic evaluation, can be used as a complement mechanism, but not the main
### Recommended Approach
- 1+2
- weight update using Exponential Moving Average (EMA) [[#^1ebcad]]
- Use weight history to analyze which weight lead to good retrieval, useful for evaluation (still needs experiment to confirm usefulness)[[#^ae110a]]
1. LLM cites used memory IDs
2. Backend identifies the path which the cited memories come from
3. Calculate feedback signals using relevance score feedback from LLM [[#^89d144]]
4. Update weight based on the signals [[#^545a7b]]
## Adaptive memory pruning 
LLM auto re-summarize (merge)/filter/discard of old memories that are not accessed anymore (easier but needs to be careful)
### Implementation
- Calculate prune score, High: Prune; Low: Keep [[#^fcbfaf]]
- Evaluate a suitable benchmark/threshold by experiment
- Trigger: time-based/count-based/hybrid (daily check + emergency prune if msg count> threshold)
- Linkage to feature 1: if node gets pruned, retrieval path is not useful, slightly penalize weight; if consolidated node gets accessed frequently, reinforce pruning aggressiveness on the project

## Adaptive query expansion
LLM expand or rewrite queries before searching, based on the current conversational context 
### Implementation
- do it last as function overlapped/overwritten by multi-path retrieval (query expansion helps semantic search)
- Backend fetches user query, send to LLM for expansion, then only vectorize 

---
# **Memory Organization**
## Memory Structure
Describes how are the nodes connected to each other
- Each chat have different bot instances that are totally isolated, no bleeding memory
- Each chat supports multiple projects, thus project memories are reusable if flagged 

### Memory Scope (In type attribute)
1. Team/Chat
2. Project
#### Team/Chat (Explicitly cross-projects)
- Team working style (Meeting every Monday 6pm)
- Communication preferences (`User` go offline every 8pm)
- Team conventions (Use `app` to do `task` for **multiple projects**)
- Recurring team norms (notify `user` for `decision/task`)

#### Project (Not necessarily cross-projects unless related)
- Tasks (Finish login module by Friday)
- Decisions (Use `app` to do `task` **only for this project**)
- Progress (`Task` is 80% done)
- Issues (Bug is interfering authentication)

### Memory Type
Used by LLM before retrieval to filter  & to route adaptive weight modification for project / chat
- project_task
- project_progress
- project_decision
- project_issue
- team_convention ← cross-project team norms 
- team_preference ← cross-project team preferences 
### Other memory 
- Weights per Chat/Projects 

---
# Code / Sample
### Sample prompt for topic shift ^306a67
```
Every N messages → LLM summarizes
                 + LLM checks:
                   "Does this look like a new project or topic shift?"
                   → If yes, flag it
                   → agent sends one message to chat:
                     "Looks like you're discussing something new —
                      is this a new project? /yes [name] or /no"
```                      

### Sample Memory Node ^df78de
```
Memory Node {
  id: uuid,
  content: "John will finish login module by Friday",
  embedding: [...],          ← vector for semantic search
  chat_id: "chat_123         ← 1st lvl hierarchy
  project_id: "proj_A",      ← 2nd lvl hierarchy, multi-project support  
  type: "project_task",      ← from LLM classifier
  speaker: "John",           ← retrieval without semantic search
  timestamp: 1234567890,     ← for recency
  access_count: 3,           ← for frequency (supports B)
  last_accessed: 1234567999, ← for adaptive pruning (B)
  weight_history: {...}      ← tracks which weights led to retrieval (A)
}
``` 

### Multi-path Retrieval pre-filter
```
# Semantic path — no type filter, free retrieval
semantic_results = collection.query( 
	query_texts=[query], 
	n_results=20, 
	where={
		"project_id": "proj_A"
	} # only project filter 
) 

# Recency / Frequency path — type filter applied 
results = collection.get( 
	where={ 
		"project_id": "proj_A", 
		"type": {"$in": inferred_types} 
	} 
) 
recency_results = sorted( 
	results, 
	key=lambda x: x.metadata["timestamp"], # accessed_count for frequency
	reverse=True 
)[:10]
````

### Weight Update EMA ^1ebcad
`w_new = α × w_old + (1 - α) × feedback_signal

### LLM Self-Evaluation Score for memory ^89d144
1. 1 node retrieved per paths:
`relevance_score = rating / total nodes retrieved
E.g. `semantic_score = 5/5 = 1.0` 

2. Multiple nodes retrieved per paths:
`relevance_score = SUM(rating)/(n * total nodes retrieved)`

E.g.
`semantic_score = (5 + 2) / (2 × 5) = 7/10 = 0.7`
`recency_score = (1 + 3) / (2 × 5) = 4/10 = 0.4` `

### Weights Update Calculation ^545a7b
Extra Score when used in output (citation_bonus = 1), amplifies final score
`signal = (citation_bonus + relevance_score) / 2`

E.g.
```
semantic_signal  = (1 + 0.7) / 2 = 0.85
recency_signal   = (0 + 0.4) / 2 = 0.2

α = 0.9      ← smoothing factor, controls adaptation speed

w1_new = α × w1_old + (1 - α) × semantic_signal
w2_new = α × w2_old + (1 - α) × recency_signal
w3_new = α × w3_old + (1 - α) × frequency_signal

total = w1_new + w2_new + w3_new    ← normalize to keep the total into 1 
w1 = w1_new / total
w2 = w2_new / total
w3 = w3_new / total
```

### Weight History ^ae110a
```
weight_history: {
  "retrieved_by": ["semantic", "recency"],  ← which paths found this node
  "times_used": 4,                          ← how often it was useful
  "last_weight_snapshot": {                 ← weights at time of retrieval
      "w1": 0.4, "w2": 0.3, 
      "w3": 0.2
  }
}
``` 

### Adaptive Pruning Score ^fcbfaf
`prune_score = age_factor × (1 / (access_count + 1))`
where:
  `age_factor   = (current_time - timestamp) / max_age`
  `access_count = number of times retrieved and used` 

### Multi-factor Retrieval Score ^5014c4
`retrieval_score = (w1 * semantic_similarity_score) + (w2 * recency_score) + (w3 * frequency_score)

### LLM Topic Shift Detection ^bd9c39
LLM prompt:
`"Given these recent messages and the current active project context,`
`has the conversation shifted to a distinctly new topic or project?`
`Return JSON: { "new_project": true/false, "confidence": 0-1, "suggested_name": "..." }"`

If confidence > threshold, prompt user to confirm

Response:
`agent: "It looks like you're discussing a new project.` 
      `Should I create 'Authentication System' as a new project? (yes/no)"`

### LLM Classifier on Memory Type ^dc8797
```
system_prompt = """
Classify this message into exactly one type:
project_task, project_decision,
project_progress, project_issue, project_summary,
team_convention, team_preference, or IGNORE.
Return JSON only: {"type": "..."}
"""
```

### Pruning Config ^47f226
```
PRUNING_CONFIG = {
    "discard_threshold_days": 30,
    "consolidate_threshold_days": 14,
    "min_access_count_to_keep": 2,
    "pruning_trigger": "hybrid",  # daily + count-based
}
```

### Sample prompt for LLM self evaluation ^30ba3b
```
Given this user query:
"[original query]"

And this response you generated:
"[generated response]"

Rate each memory node from 1-5 on how useful it was
for generating the response:
  5 = essential, directly used
  4 = helpful, influenced the response
  3 = somewhat relevant, minor influence
  2 = retrieved but not useful
  1 = completely irrelevant

Return JSON only:
{
  "mem_001": 5,
  "mem_002": 2,
  "mem_003": 4,
  "mem_004": 1,
  "mem_005": 3
}
```

### Relational Database structure
```
Users
  - id
  - username
  - email
  - password_hash      ← Custom Auth system
  - created_at

Chats
  - chat_id
  - chat_name
  - chat_type          ← group / direct message
  - description        ← chat info and bio
  - last_activity      ← for sorting active chats
  - ai_listening       ← boolean (0/1) for whether agent listens and stores memory
  - created_at

Chat_Members
  - chat_id
  - user_name
  - role               ← owner / member
  - joined_at

Projects
  - project_id
  - chat_id            ← which chat this project belongs to
  - name
  - created_by         ← username
  - created_at
  - status             ← active / archived

Weights
  - id
  - chat_id
  - project_id         ← null if chat-level weights
  - w1, w2, w3
  - alpha              ← EMA smoothing factor
  - updated_at

Message_Buffer
  - id
  - chat_id
  - message
  - user_name
  - timestamp

Messages
  - id
  - chat_id
  - sender
  - text
  - timestamp          ← persistent message history

Friendships
  - user1
  - user2
  - status             ← pending / accepted
  - created_at

Notifications
  - id
  - username
  - title
  - message
  - is_read            ← boolean (0/1)
  - created_at
```

### LLM Response after summarization ^e56f18
```
{ 
	"nodes": [ {
		"type": "project_issue", "project_id": "proj_A", 
		"content": "auth bug blocking deployment"
	}, 
	{
		"type": "project_task", "project_id": "proj_A", 
		"content": "John to fix auth bug by tomorrow"
	}, 
	{
		"type": "team_convention", "project_id": null, 
		"content": "team uses Jira for bug tracking"
	} ], 
	"unknown": ["check the deployment thing"], 
	"new_project_detected": false 
}
```

---
# Current issue
1. Are memory organization/weights global/chat/project based? ==(Solved)==
- Global: easiest to implement, but memory will be messy & might interfere
- Chat: most practical, Each chat might be reused for several projects if same team, then user preferences can be reused.
- Project: might be too detailed, and some nodes might need to be reused across projects
2. What types are there for memory nodes ==(Solved)==
- How should memory be stored (User/preference/project/issue/solution)
- What structure (hierarchical?)
3. How does LLM / backend identify different projects and tag them with IDs? ==(Solved)==
4. What if a chat discusses multiple projects at the same time ==(Solved)==
5. Need enable user customization on memory pruning? Such as how long before discarding / summarizing memory. ==(Solved)==
6. Need an importance score in each memory nodes to prevent getting consolidated? ==(Solved)==
7. LLM self evaluation score ==(Solved)==
8. How is the data stored in database ==(Solved)==

### Issue 1
- Use hierarchical structure using scope attribute (Chat -> Project)
- But LLM has no clear method of differentiating different projects in 1 chat [[#^756dfb]]
- Each Chat has its own weight (stable), project has its own weight (tuned frequently)
### Issue 2
- Scope and type will be combined into 1 attribute, backend split them at retrieval
- Needs to explicitly inform LLM the range of available types [[#^dc8797]]
### Issue 3 ^756dfb
- No exact way of clearly detecting
1. Explicit declaration by users (type command like `/project new "Name"`)  ^35c3e3
2. LLM topic clustering (After every summary, LLM detect topic shift)  [[#^bd9c39]]
3. Hybrid (Default with command, LLM detects implicit shift & ask if unsure)
- But currently agent only response with a @, and will not actively sends message
- Thus might need to modify the fundamentals/exceptions
1. Confirms every end of summarization cycle
2. agent ask after first message in a chat after X hours of inactivity

### Issue 4
- backend buffers n messages and sends to LLM, LLM will first identify if there're different projects, classifies them, them summarize into different projects by id based on the memory.
1. LLM classifies each msg by type + project
2. Group msg by projects
3. Summarize each group separately 
4. Identifies distinct tasks / issues in each project as separate nodes
- Methods of identifying different projects:
1. Explicit mention: "the auth bug" → matches known project "Auth System" (only takes priority if users mention like [[#^35c3e3]])
2. Entity matching with semantic search: "PR", "migration" → DB Migration project (first choice)
3. Unknown: leave it in unknown section, classifies after user replied to agent query [[#^756dfb]]
### Issue 5
- enable configurations at system/development level, not user level [[#^47f226]]
- Optional: simple toggle at chat level 
- (Memory retention: [Short (14d)] [Medium (30d)] [Long (60d)])

### Issue 6
- accessed_count in memory nodes represents importance (just like frequency is to contextual importance in the old retrieval scoring formula)
- LLM classifier can also filter out necessary contents to prevent similar pruning to messages like "John said ok" & "Deadline moved to next week" even if they are new & not accessed yet
- Add lightweight importance scoring (evaluated by LLM) to resist pruning / ==Not adding it at all==

### Issue 7
Call LLM twice:
- First LLM call: Input: query + Top-K nodes Output: response + USED:[id1, id2] 
- Second LLM call: Input: query + Top-K nodes + generated response Output: relevance rating per node [[#^30ba3b]]
Useful when:
- Query is broad: LLM refers to multiple nodes indirectly for 1 output
- Response is long
- Nodes are similar: hard to distinguish which node is actually used
Less useful when:
- Query is specific: one node is enough to answer
- Response is short: obvious which node is used
Cost Optimization (LLM called twice per retrieval)
- Only run self-evaluation every Nth retrieval 
- Only run when response is above certain length 
- Use a smaller/cheaper model for evaluation call ==(Most feasible)==

### Issue 8
2 Databases: Relational Database + Vector Database
1. RDB stores chat data
- Chats (chat_id, chat_name, chat_type)
- Projects (project_id, chat_id, name, status)
- Chat Members (chat_id, user_name, role)
- Weights (chat_id, project_id, w1, w2, w3)
- Message_Buffer (chat_id, message, user_name, timestamp)
2. Vector database stores memory nodes
- embeddings + metadata

