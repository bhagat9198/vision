TECHNICAL PRD --- MVP v2.0

**VisionIQ**

AI-Powered CCTV Intelligence --- Video In → Analyse → Chatbot Retrieve

  ------------------------- ---------------------------------------------
  **Version**               2.0 --- Final MVP

  **Architecture**          Vision LLM + Session Memory + Rule Vector
                            Search

  **Input**                 Video file (MP4/MOV/AVI, min 1hr)

  **Core insight**          Rules are a search problem, not a prompt
                            problem
  ------------------------- ---------------------------------------------

**1. Architecture Overview**

  ------------- ------------------------------------------------------------
  **Core        No YOLO. No zone drawing. Vision LLM reads the scene. Rules
  principle**   are stored as vectors --- only top-5 relevant rules are ever
                sent to the LLM. Session memory prevents false positives.

  ------------- ------------------------------------------------------------

**1.1 The Three Hard Problems --- And How We Solve Them**

  ------------------ -------------------------- --------------------------
  **Problem**        **Naive approach**         **Our approach**

  1000 rules in      Send all 1000 rules → LLM  Embed rules → vector
  prompt             breaks, cost explodes      search → send only top-5
                                                relevant rules

  False positives    Alert on every suspicious  Session memory: hold
                     frame                      events, evaluate full
                                                timeline before alerting

  Temporal actions   Single frame analysis ---  Rolling session window:
  (maid cooks then   misses intent              1-line descriptions
  steals)                                       accumulated, LLM reasons
                                                across full timeline
  ------------------ -------------------------- --------------------------

**1.2 Full System Data Flow**

+-----------------------------------------------------------------------+
| VIDEO FILE UPLOADED                                                   |
|                                                                       |
| │                                                                     |
|                                                                       |
| ▼                                                                     |
|                                                                       |
| ┌─────────────────────────────────────────────────────┐               |
|                                                                       |
| │ INGESTION LAYER │                                                   |
|                                                                       |
| │ api-gateway → S3 storage → job created in Postgres │                |
|                                                                       |
| └─────────────────────────────┬───────────────────────┘               |
|                                                                       |
| │                                                                     |
|                                                                       |
| ▼                                                                     |
|                                                                       |
| ┌─────────────────────────────────────────────────────┐               |
|                                                                       |
| │ FRAME PIPELINE │                                                    |
|                                                                       |
| │ video-processor (ffmpeg) → frames @ 1fps → S3 │                     |
|                                                                       |
| │ publishes batches of 30 frames to Redis queue │                     |
|                                                                       |
| └─────────────────────────────┬───────────────────────┘               |
|                                                                       |
| │                                                                     |
|                                                                       |
| ▼                                                                     |
|                                                                       |
| ┌─────────────────────────────────────────────────────┐               |
|                                                                       |
| │ MOTION FILTER (cheap --- runs on every frame) │                     |
|                                                                       |
| │ OpenCV background subtractor │                                      |
|                                                                       |
| │ Motion detected? YES → continue NO → skip frame │                   |
|                                                                       |
| └─────────────────────────────┬───────────────────────┘               |
|                                                                       |
| │ (motion frames only \~10-20%)                                       |
|                                                                       |
| ▼                                                                     |
|                                                                       |
| ┌─────────────────────────────────────────────────────┐               |
|                                                                       |
| │ VISION LLM --- SCENE DESCRIPTION (per motion frame) │               |
|                                                                       |
| │ GPT-4o Vision / Gemini 1.5 Flash │                                  |
|                                                                       |
| │ Prompt: \"Describe what is happening in 1-2 lines\" │               |
|                                                                       |
| │ Output: \"Woman removing apple from refrigerator\" │                |
|                                                                       |
| └─────────────────────────────┬───────────────────────┘               |
|                                                                       |
| │                                                                     |
|                                                                       |
| ▼                                                                     |
|                                                                       |
| ┌─────────────────────────────────────────────────────┐               |
|                                                                       |
| │ SESSION MANAGER │                                                   |
|                                                                       |
| │ Groups frame descriptions into activity sessions │                  |
|                                                                       |
| │ Session = continuous activity window per camera │                   |
|                                                                       |
| │ Appends each description to running session log │                   |
|                                                                       |
| └─────────────────────────────┬───────────────────────┘               |
|                                                                       |
| │ every 60s OR session close                                          |
|                                                                       |
| ▼                                                                     |
|                                                                       |
| ┌─────────────────────────────────────────────────────┐               |
|                                                                       |
| │ RULE RETRIEVAL (vector search --- fast, cheap) │                    |
|                                                                       |
| │ Embed session summary → search rule vector DB │                     |
|                                                                       |
| │ Returns top-5 most relevant rules for this session │                |
|                                                                       |
| └─────────────────────────────┬───────────────────────┘               |
|                                                                       |
| │                                                                     |
|                                                                       |
| ▼                                                                     |
|                                                                       |
| ┌─────────────────────────────────────────────────────┐               |
|                                                                       |
| │ VISION LLM --- RULE EVALUATION (small prompt) │                     |
|                                                                       |
| │ Input: session timeline + top-5 rules only │                        |
|                                                                       |
| │ Output: violated? yes/no + reasoning + severity │                   |
|                                                                       |
| └─────────────────────────────┬───────────────────────┘               |
|                                                                       |
| │ if violation found                                                  |
|                                                                       |
| ▼                                                                     |
|                                                                       |
| ┌─────────────────────────────────────────────────────┐               |
|                                                                       |
| │ EVENT WRITER │                                                      |
|                                                                       |
| │ Writes structured event to Postgres │                               |
|                                                                       |
| │ Embeds event description → Qdrant vector DB │                       |
|                                                                       |
| │ Saves thumbnail to S3 │                                             |
|                                                                       |
| │ Publishes to alert queue if severity = high │                       |
|                                                                       |
| └─────────────────────────────┬───────────────────────┘               |
|                                                                       |
| │                                                                     |
|                                                                       |
| ▼                                                                     |
|                                                                       |
| ┌─────────────────────────────────────────────────────┐               |
|                                                                       |
| │ CHATBOT (RAG) │                                                     |
|                                                                       |
| │ User asks question → semantic + structured search │                 |
|                                                                       |
| │ LLM answers from event memory │                                     |
|                                                                       |
| │ Weekly report generated on demand │                                 |
|                                                                       |
| └─────────────────────────────────────────────────────┘               |
+-----------------------------------------------------------------------+

**2. Session Memory --- Core Engine**

  ---------- ------------------------------------------------------------
  **Why      A single frame cannot determine intent. The maid takes
  sessions   cheese at 12:32 (cooking?) and bags it at 13:12. Only the
  exist**    full timeline reveals the violation. Sessions hold the
             context.

  ---------- ------------------------------------------------------------

**2.1 Session Lifecycle**

+-----------------------------------------------------------------------+
| SESSION OPEN                                                          |
|                                                                       |
| Trigger: motion detected + person present in frame                    |
|                                                                       |
| Creates: session record in Postgres with session_id, camera_id,       |
| started_at                                                            |
|                                                                       |
| SESSION ACTIVE --- per motion frame:                                  |
|                                                                       |
| 1\. Vision LLM produces 1-line description                            |
|                                                                       |
| 2\. Description appended to session.timeline\[\]                      |
|                                                                       |
| 3\. Identity matched: known profile name OR Person1/Person2\...       |
|                                                                       |
| 4\. Every 60s → trigger session evaluation (see S2.2)                 |
|                                                                       |
| SESSION CLOSE                                                         |
|                                                                       |
| Trigger: no motion detected for N minutes (default: 5 min,            |
| configurable)                                                         |
|                                                                       |
| Final evaluation runs on close                                        |
|                                                                       |
| Session marked complete in Postgres                                   |
|                                                                       |
| SESSION MAX LENGTH                                                    |
|                                                                       |
| Hard cap: 3 hours                                                     |
|                                                                       |
| After 3hrs: force close, open new session                             |
+-----------------------------------------------------------------------+

**2.2 Session Evaluation (Every 60s + On Close)**

+-----------------------------------------------------------------------+
| def evaluate_session(session):                                        |
|                                                                       |
| \# Step 1: Build session summary string                               |
|                                                                       |
| summary = \"\\n\".join(\[                                             |
|                                                                       |
| f\"{e\[\'timestamp\'\]} --- {e\[\'description\'\]}\"                  |
|                                                                       |
| for e in session.timeline                                             |
|                                                                       |
| \])                                                                   |
|                                                                       |
| \# Example summary:                                                   |
|                                                                       |
| \# 12:30 --- Maid entered kitchen                                     |
|                                                                       |
| \# 12:32 --- Maid opened fridge, removed cheese packet                |
|                                                                       |
| \# 12:35 --- Maid began cooking on stove                              |
|                                                                       |
| \# 13:10 --- Maid picked up cheese packet again                       |
|                                                                       |
| \# 13:12 --- Maid placed cheese packet into handbag                   |
|                                                                       |
| \# Step 2: Embed summary → fetch top-5 relevant rules                 |
|                                                                       |
| summary_vec = embed(summary)                                          |
|                                                                       |
| top_rules = qdrant_rules.search(                                      |
|                                                                       |
| collection = \"rules\_\" + session.camera_id,                         |
|                                                                       |
| vector = summary_vec,                                                 |
|                                                                       |
| limit = 5                                                             |
|                                                                       |
| )                                                                     |
|                                                                       |
| \# Step 3: LLM evaluates timeline vs top-5 rules only                 |
|                                                                       |
| result = llm.invoke(                                                  |
|                                                                       |
| EVALUATION_PROMPT.format(                                             |
|                                                                       |
| timeline = summary,                                                   |
|                                                                       |
| rules = format_rules(top_rules),                                      |
|                                                                       |
| profiles = session.known_profiles                                     |
|                                                                       |
| )                                                                     |
|                                                                       |
| )                                                                     |
|                                                                       |
| \# Step 4: If violation → write event                                 |
|                                                                       |
| if result.violated:                                                   |
|                                                                       |
| write_event(session, result)                                          |
|                                                                       |
| if result.severity == \"high\":                                       |
|                                                                       |
| push_alert(session.camera_id, result)                                 |
+-----------------------------------------------------------------------+

**2.3 Evaluation Prompt Design**

+-----------------------------------------------------------------------+
| SYSTEM:                                                               |
|                                                                       |
| You are a security analyst reviewing camera footage.                  |
|                                                                       |
| You will be given a timeline of observed activity and a list of       |
| rules.                                                                |
|                                                                       |
| Reason carefully across the FULL timeline before deciding.            |
|                                                                       |
| A single frame is not enough --- consider intent and sequence.        |
|                                                                       |
| USER:                                                                 |
|                                                                       |
| KNOWN PROFILES: Sunita (maid), Rahul (owner), Priya (owner)           |
|                                                                       |
| ACTIVITY TIMELINE:                                                    |
|                                                                       |
| 12:30 --- Sunita entered kitchen                                      |
|                                                                       |
| 12:32 --- Sunita opened fridge, removed cheese packet                 |
|                                                                       |
| 12:35 --- Sunita began cooking on stove                               |
|                                                                       |
| 13:10 --- Sunita picked up cheese packet again                        |
|                                                                       |
| 13:12 --- Sunita placed cheese packet into handbag                    |
|                                                                       |
| RULES TO CHECK:                                                       |
|                                                                       |
| 1\. Alert if maid takes food items for personal use (eating or        |
| bagging)                                                              |
|                                                                       |
| 2\. Alert if unknown person enters kitchen                            |
|                                                                       |
| 3\. Alert if food is wasted or mishandled                             |
|                                                                       |
| Does any rule apply? Respond in JSON:                                 |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"violated\": true/false,                                             |
|                                                                       |
| \"rule_matched\": \"rule text or null\",                              |
|                                                                       |
| \"reasoning\": \"explain why, referencing timeline\",                 |
|                                                                       |
| \"severity\": \"low/medium/high\",                                    |
|                                                                       |
| \"summary\": \"one sentence for event log\"                           |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**2.4 False Positive Prevention --- Key Examples**

  ------------------ -------------------------- --------------------------
  **Scenario**       **Timeline sequence**      **Verdict**

  Maid cooks with    Takes cheese → cooks 47min No violation --- used for
  cheese             → puts back                cooking

  Maid steals cheese Takes cheese → cooks →     ALERT --- rule 1 violated
                     bags remainder             at 13:12

  Maid eats apple    Opens fridge → eats apple  ALERT --- eating employer
  before cooking     → starts cooking           food

  Owner takes bike   Rahul (registered) takes   No alert --- known profile
                     bike at 8am                

  Unknown person     Person1 (unknown) takes    ALERT --- unregistered
  takes bike         bike at 8am                person

  Maid scans fridge, Opens fridge 10s, closes,  No violation --- no item
  doesn\'t take      starts cooking             removed
  ------------------ -------------------------- --------------------------

**2.5 Session Data Schema (Postgres)**

+-----------------------------------------------------------------------+
| CREATE TABLE sessions (                                               |
|                                                                       |
| session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                |
|                                                                       |
| job_id UUID NOT NULL,                                                 |
|                                                                       |
| camera_id TEXT NOT NULL,                                              |
|                                                                       |
| started_at TIMESTAMPTZ NOT NULL,                                      |
|                                                                       |
| ended_at TIMESTAMPTZ,                                                 |
|                                                                       |
| status TEXT DEFAULT \'active\', \-- active \| closed \| evaluated     |
|                                                                       |
| timeline JSONB NOT NULL DEFAULT \'\[\]\',                             |
|                                                                       |
| \-- timeline item: { timestamp, video_offset_s, description,          |
| persons_present\[\] }                                                 |
|                                                                       |
| persons_seen TEXT\[\], \-- all person_ids seen in this session        |
|                                                                       |
| eval_count INT DEFAULT 0, \-- how many times evaluated                |
|                                                                       |
| last_eval_at TIMESTAMPTZ,                                             |
|                                                                       |
| created_at TIMESTAMPTZ DEFAULT NOW()                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE INDEX idx_sessions_camera ON sessions(camera_id, status);      |
|                                                                       |
| CREATE INDEX idx_sessions_job ON sessions(job_id);                    |
+-----------------------------------------------------------------------+

**3. Rules Engine**

**3.1 Rule Storage --- Vector DB**

  ----------- ------------------------------------------------------------
  **Key       Rules are NOT evaluated at query time by scanning all 1000.
  insight**   They are pre-embedded into vectors. At runtime, only the
              top-5 semantically relevant rules are retrieved per session.
              Scales to 100,000 rules with no performance change.

  ----------- ------------------------------------------------------------

+-----------------------------------------------------------------------+
| \# Rule ingestion --- runs once when rule is created                  |
|                                                                       |
| def ingest_rule(rule: str, camera_id: str, rule_id: str):             |
|                                                                       |
| vector = embed(rule) \# text-embedding-3-small                        |
|                                                                       |
| qdrant_rules.upsert(                                                  |
|                                                                       |
| collection = \"rules\_\" + camera_id,                                 |
|                                                                       |
| points = \[{                                                          |
|                                                                       |
| \"id\": rule_id,                                                      |
|                                                                       |
| \"vector\": vector,                                                   |
|                                                                       |
| \"payload\": {                                                        |
|                                                                       |
| \"rule_text\": rule,                                                  |
|                                                                       |
| \"rule_id\": rule_id,                                                 |
|                                                                       |
| \"camera_id\": camera_id,                                             |
|                                                                       |
| \"source\": \"template\|custom\|ai_generated\",                       |
|                                                                       |
| \"enabled\": True,                                                    |
|                                                                       |
| \"created_at\": now()                                                 |
|                                                                       |
| }                                                                     |
|                                                                       |
| }\]                                                                   |
|                                                                       |
| )                                                                     |
+-----------------------------------------------------------------------+

**3.2 Three Ways to Create Rules**

  ------------------ -------------------------- --------------------------
  **Method**         **How it works**           **MVP phase**

  Template Packs     User picks a preset        MVP launch
                     (Home/School/Office). All  
                     rules in pack              
                     auto-ingested to their     
                     rule vector DB.            

  Custom Text Input  User types plain English   MVP launch
                     rule in dashboard. System  
                     embeds and stores it.      

  AI Rule Generator  User describes situation   V2
                     in chat. AI generates      
                     structured rules. User     
                     approves. System ingests.  
  ------------------ -------------------------- --------------------------

**3.3 Template Rule Packs**

  ------------ ------------------------------------------------- ---------
  **Pack**     **Sample Rules (each stored as separate vector)** 

  Home         Alert if maid/domestic help takes food items for  
               personal use                                      

  Home         Alert if unknown person enters any room           

  Home         Alert if registered bike/vehicle is taken by      
               unknown person                                    

  Home         Alert if child is left alone for more than 10     
               minutes                                           

  School       Alert if student is seen near exit gate without   
               adult                                             

  School       Alert if teacher is absent from classroom for     
               more than 5 minutes                               

  School       Alert if unknown adult is on school premises      

  Office       Alert if person is in office after working hours  

  Office       Alert if person accesses restricted area          

  Warehouse    Alert if person falls or appears injured          

  Warehouse    Alert if unattended bag or object is left in zone 
  ------------ ------------------------------------------------- ---------

**3.4 Rule Schema (Postgres --- metadata only, vector in Qdrant)**

+-----------------------------------------------------------------------+
| CREATE TABLE rules (                                                  |
|                                                                       |
| rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                   |
|                                                                       |
| camera_id TEXT NOT NULL,                                              |
|                                                                       |
| user_id UUID NOT NULL,                                                |
|                                                                       |
| rule_text TEXT NOT NULL, \-- plain English rule                       |
|                                                                       |
| source TEXT NOT NULL, \-- template \| custom \| ai_generated          |
|                                                                       |
| pack_name TEXT, \-- e.g. \"home\", \"school\"                         |
|                                                                       |
| enabled BOOLEAN DEFAULT true,                                         |
|                                                                       |
| created_at TIMESTAMPTZ DEFAULT NOW()                                  |
|                                                                       |
| );                                                                    |
+-----------------------------------------------------------------------+

**4. Identity Service**

**4.1 How Identity Works**

  ---------------------- ------------------------------------------------
  **Scenario**           **Behaviour**

  Known person           Face matched to profile → referred to by name in
  (onboarded)            session timeline: \'Sunita entered kitchen\'

  Unknown person         Auto-labelled Person1, Person2\... → consistent
                         across frames and sessions for same camera

  Same unknown across    DeepFace embedding compared to known unknowns →
  sessions               same label maintained across days

  User names an unknown  User taps \'Person1\' in dashboard, types
  later                  \'Delivery Guy\'. Label backfilled in all past
                         events.
  ---------------------- ------------------------------------------------

**4.2 Onboarding Flow (Setup)**

+-----------------------------------------------------------------------+
| POST /profiles                                                        |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"camera_id\": \"kitchen_cam_01\",                                    |
|                                                                       |
| \"name\": \"Sunita\",                                                 |
|                                                                       |
| \"role\": \"maid\",                                                   |
|                                                                       |
| \"photo_base64\": \"\...\"                                            |
|                                                                       |
| }                                                                     |
|                                                                       |
| System:                                                               |
|                                                                       |
| 1\. Extract face embedding using DeepFace (ArcFace model)             |
|                                                                       |
| 2\. Store embedding in profiles table                                 |
|                                                                       |
| 3\. Store embedding vector in Qdrant: collection = \"faces\_\" +      |
| camera_id                                                             |
|                                                                       |
| At runtime --- per frame with person detected:                        |
|                                                                       |
| 1\. Extract face crop from frame                                      |
|                                                                       |
| 2\. Compute DeepFace embedding                                        |
|                                                                       |
| 3\. Search Qdrant faces collection (cosine similarity)                |
|                                                                       |
| 4\. Match found (score \> 0.6) → use profile name                     |
|                                                                       |
| 5\. No match → assign next available PersonN label                    |
|                                                                       |
| 6\. Store PersonN embedding so it stays consistent                    |
+-----------------------------------------------------------------------+

**4.3 Profile Schema**

+-----------------------------------------------------------------------+
| CREATE TABLE profiles (                                               |
|                                                                       |
| profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                |
|                                                                       |
| camera_id TEXT NOT NULL,                                              |
|                                                                       |
| user_id UUID NOT NULL,                                                |
|                                                                       |
| name TEXT NOT NULL, \-- \"Sunita\" or \"Person1\"                     |
|                                                                       |
| role TEXT, \-- maid \| owner \| student \| staff \| unknown           |
|                                                                       |
| is_registered BOOLEAN DEFAULT true, \-- false for auto-labelled       |
| unknowns                                                              |
|                                                                       |
| face_vector_id TEXT, \-- Qdrant point ID                              |
|                                                                       |
| created_at TIMESTAMPTZ DEFAULT NOW()                                  |
|                                                                       |
| );                                                                    |
+-----------------------------------------------------------------------+

**5. Microservices --- Complete List**

  ------------------- -------------------------- --------------------------
  **Service**         **Responsibility**         **Stack**

  api-gateway         Video upload, auth, job    FastAPI + Python
                      creation, profile/rule     
                      CRUD                       

  video-processor     ffmpeg frame extraction at Python + ffmpeg-python
                      configured fps, uploads to 
                      S3                         

  motion-filter       OpenCV background          Python + OpenCV
                      subtraction --- mark       
                      frames as motion/no-motion 

  scene-describer     Call Vision LLM on motion  Python + OpenAI SDK
                      frames, produce 1-line     
                      description per frame      

  session-manager     Open/close sessions,       Python
                      append descriptions,       
                      trigger evaluations        

  rule-retriever      Embed session summary,     Python + LangChain
                      search Qdrant rules        
                      collection, return top-5   

  session-evaluator   Send timeline + top-5      Python + LangChain
                      rules to LLM, parse        
                      verdict, emit event if     
                      violated                   

  identity-service    DeepFace matching on       Python + DeepFace
                      person crops, assign name  
                      or PersonN label           

  event-writer        Write events to Postgres,  Python + Qdrant
                      embed to Qdrant events     
                      collection, save thumbnail 

  alert-service       Consume high-severity      Python
                      events, push               
                      Telegram/WhatsApp/email    
                      notification               

  chat-api            RAG chatbot --- semantic + FastAPI + LangChain
                      structured search, weekly  
                      report generation          

  rules-api           CRUD for rules, template   FastAPI + Python
                      pack installation, AI rule 
                      generation (V2)            
  ------------------- -------------------------- --------------------------

**5.1 Queue Topics (Redis Streams)**

  --------------------- -------------------------- --------------------------
  **Topic**             **Publisher**              **Consumer(s)**

  video.uploaded        api-gateway                video-processor

  frames.extracted      video-processor            motion-filter

  frames.motion         motion-filter              scene-describer,
                                                   identity-service
                                                   (parallel)

  frame.described       scene-describer            session-manager

  session.evaluate      session-manager (timer +   rule-retriever
                        close)                     

  session.rules_ready   rule-retriever             session-evaluator

  event.created         session-evaluator          event-writer

  event.written         event-writer               alert-service (if high
                                                   severity)
  --------------------- -------------------------- --------------------------

**6. Data Schemas**

**6.1 Events Table (Postgres)**

+-----------------------------------------------------------------------+
| CREATE TABLE events (                                                 |
|                                                                       |
| event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                  |
|                                                                       |
| job_id UUID NOT NULL,                                                 |
|                                                                       |
| session_id UUID REFERENCES sessions(session_id),                      |
|                                                                       |
| camera_id TEXT NOT NULL,                                              |
|                                                                       |
| timestamp TIMESTAMPTZ NOT NULL,                                       |
|                                                                       |
| video_offset_s FLOAT NOT NULL,                                        |
|                                                                       |
| persons_involved TEXT\[\], \-- \[\"Sunita\", \"Person1\"\]            |
|                                                                       |
| rule_matched TEXT, \-- exact rule text that fired                     |
|                                                                       |
| reasoning TEXT, \-- LLM\'s reasoning                                  |
|                                                                       |
| severity TEXT NOT NULL, \-- low \| medium \| high                     |
|                                                                       |
| description TEXT NOT NULL, \-- one-line event summary                 |
|                                                                       |
| timeline_window JSONB, \-- snapshot of session timeline at time of    |
| event                                                                 |
|                                                                       |
| thumbnail_url TEXT,                                                   |
|                                                                       |
| clip_url TEXT,                                                        |
|                                                                       |
| created_at TIMESTAMPTZ DEFAULT NOW()                                  |
|                                                                       |
| );                                                                    |
|                                                                       |
| CREATE INDEX idx_events_job ON events(job_id);                        |
|                                                                       |
| CREATE INDEX idx_events_camera ON events(camera_id, timestamp);       |
|                                                                       |
| CREATE INDEX idx_events_person ON events USING GIN(persons_involved); |
|                                                                       |
| CREATE INDEX idx_events_severity ON events(severity);                 |
+-----------------------------------------------------------------------+

**6.2 Qdrant Collections Summary**

  -------------------- -------------------------- --------------------------
  **Collection name**  **What is stored**         **Used by**

  events\_{job_id}     Vector of                  chat-api RAG retrieval
                       event.description per job. 
                       Metadata: timestamp,       
                       persons, severity          

  rules\_{camera_id}   Vector of each rule text.  rule-retriever top-5
                       Metadata: rule_id, source, search
                       enabled                    

  faces\_{camera_id}   DeepFace embedding per     identity-service matching
                       profile. Metadata:         
                       profile_id, name, role     
  -------------------- -------------------------- --------------------------

**6.3 Jobs Table (Postgres)**

+-----------------------------------------------------------------------+
| CREATE TABLE jobs (                                                   |
|                                                                       |
| job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                    |
|                                                                       |
| user_id UUID NOT NULL,                                                |
|                                                                       |
| camera_id TEXT,                                                       |
|                                                                       |
| status TEXT DEFAULT \'queued\',                                       |
|                                                                       |
| \-- queued → extracting → processing → evaluating → done \| failed    |
|                                                                       |
| video_url TEXT NOT NULL,                                              |
|                                                                       |
| video_duration_s FLOAT,                                               |
|                                                                       |
| fps_setting FLOAT DEFAULT 1.0,                                        |
|                                                                       |
| total_frames INT,                                                     |
|                                                                       |
| motion_frames INT, \-- frames that passed motion filter               |
|                                                                       |
| frames_done INT DEFAULT 0,                                            |
|                                                                       |
| sessions_count INT DEFAULT 0,                                         |
|                                                                       |
| events_count INT DEFAULT 0,                                           |
|                                                                       |
| created_at TIMESTAMPTZ DEFAULT NOW(),                                 |
|                                                                       |
| completed_at TIMESTAMPTZ                                              |
|                                                                       |
| );                                                                    |
+-----------------------------------------------------------------------+

**7. Chatbot & Weekly Report**

**7.1 Chat API --- RAG Flow**

+-----------------------------------------------------------------------+
| POST /chat                                                            |
|                                                                       |
| { \"job_id\": \"\...\", \"question\": \"Where was Sunita at 12:40?\", |
| \"history\": \[\] }                                                   |
|                                                                       |
| Step 1 --- Parse question                                             |
|                                                                       |
| Extract: person hint = \"Sunita\", time hint = \"12:40\"              |
|                                                                       |
| Step 2 --- Semantic search                                            |
|                                                                       |
| embed(question) → search Qdrant events\_{job_id} → top-10 similar     |
| events                                                                |
|                                                                       |
| Step 3 --- Structured filter                                          |
|                                                                       |
| SELECT \* FROM events                                                 |
|                                                                       |
| WHERE job_id = ?                                                      |
|                                                                       |
| AND \'Sunita\' = ANY(persons_involved)                                |
|                                                                       |
| AND timestamp BETWEEN \'12:35\' AND \'12:45\'                         |
|                                                                       |
| ORDER BY timestamp                                                    |
|                                                                       |
| Step 4 --- Merge + deduplicate both result sets                       |
|                                                                       |
| Step 5 --- LLM answer                                                 |
|                                                                       |
| System: \"You are a security assistant. Answer using ONLY the events  |
| provided.\"                                                           |
|                                                                       |
| Context: top-8 merged events with timestamps                          |
|                                                                       |
| Question: \"Where was Sunita at 12:40?\"                              |
|                                                                       |
| Step 6 --- Response                                                   |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"answer\": \"Sunita was in the kitchen at 12:40, seen picking up the |
| cheese packet from the counter.\",                                    |
|                                                                       |
| \"events\": \[ { event_id, timestamp, description, thumbnail_url } \] |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**7.2 Weekly Report**

+-----------------------------------------------------------------------+
| GET /report/weekly?job_id=\...&camera_id=\...                         |
|                                                                       |
| System aggregates from events table:                                  |
|                                                                       |
| \- Total sessions this week                                           |
|                                                                       |
| \- Events by severity (high/medium/low counts)                        |
|                                                                       |
| \- Events by person                                                   |
|                                                                       |
| \- Most frequent rule violations                                      |
|                                                                       |
| \- Unusual patterns (time-based anomalies)                            |
|                                                                       |
| Then LLM generates natural language summary:                          |
|                                                                       |
| \"This week --- 4 fridge visits before starting to cook.              |
|                                                                       |
| 3 apples gone, banana from Tuesday missing,                           |
|                                                                       |
| caught eating blueberries on Thursday --- 6-7 of them.                |
|                                                                       |
| Hands washed 5 out of 7 days before cooking.                          |
|                                                                       |
| Cooking time consistently under 35 mins.\"                            |
|                                                                       |
| Response:                                                             |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"narrative\": \"\...\",                                              |
|                                                                       |
| \"stats\": { \"total_events\": 24, \"high_severity\": 3, \... },      |
|                                                                       |
| \"top_events\": \[ \... \]                                            |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**8. Full Tech Stack**

  ------------- ------------------------ --------------------------- ------------------
  **Layer**     **Tool**                 **Why**                     **Alt**

  API framework FastAPI                  Async, fast, auto docs      Flask

  Video decode  ffmpeg-python            Handles all formats         moviepy

  Motion        OpenCV (MOG2)            Free, fast, CPU-only, cuts  PySceneDetect
  detection                              80% LLM calls               

  Vision LLM    GPT-4o Vision            Best scene understanding    Gemini 1.5 Flash
                                                                     (cheaper)

  Embedding     text-embedding-3-small   1536-dim, cheap, fast       nomic-embed
  model                                                              (free/local)

  Face          DeepFace (ArcFace)       Accurate, no GPU needed     face_recognition
  recognition                                                        lib

  LLM framework LangChain                Swap LLMs easily, RAG       LlamaIndex
                                         chains                      

  Vector DB     Qdrant                   Self-host, metadata filter, Pinecone (managed)
                                         fast                        

  Structured DB PostgreSQL 16            Reliable, JSONB, array ops  MySQL

  Message queue Redis Streams            Zero infra for MVP          Kafka (at scale)

  Object        MinIO (local/dev)        S3-compatible, self-host    AWS S3 (prod)
  storage                                                            

  Alerts        Telegram Bot API         Instant, free, no app       Firebase Push
                                         needed                      

  Containers    Docker + Compose         All services local in 1     Kubernetes (prod)
                                         command                     
  ------------- ------------------------ --------------------------- ------------------

**9. API Reference**

  ------------------------------ ------------------------------ --------------------------
  **Method + Path**              **Input**                      **Output**

  POST /jobs/upload              video file (multipart), fps,   { job_id, status }
                                 camera_id                      

  GET /jobs/{job_id}             ---                            { status, progress%,
                                                                sessions, events_count }

  GET /jobs/{job_id}/events      ?person=&severity=&from=&to=   \[ event list with
                                                                thumbnails \]

  POST /chat                     { job_id, question,            { answer,
                                 history\[\] }                  supporting_events\[\] }

  GET /report/weekly             ?job_id=&camera_id=            { narrative, stats,
                                                                top_events }

  POST /profiles                 { camera_id, name, role,       { profile_id }
                                 photo_base64 }                 

  GET /profiles/{camera_id}      ---                            \[ profile list \]

  POST /rules                    { camera_id, rule_text, source { rule_id }
                                 }                              

  POST /rules/install-pack       { camera_id, pack_name }       { rules_added: N }

  GET /rules/{camera_id}         ---                            \[ rule list \]

  DELETE /rules/{rule_id}        ---                            { deleted: true }

  GET                            ---                            JPEG image
  /events/{event_id}/thumbnail                                  
  ------------------------------ ------------------------------ --------------------------

**10. Cost & Performance Estimates**

  -------------- ------------------------------------------------------------
  **Baseline**   1-hour video at 1fps = 3,600 raw frames. After motion filter
                 (\~15% pass): \~540 motion frames sent to Vision LLM.

  -------------- ------------------------------------------------------------

**10.1 Processing Time (1hr video, 4 parallel workers)**

  ---------------------- ------------------------------------------------
  **Step**               **Estimate**

  Frame extraction       \~25 seconds
  (ffmpeg)               

  Motion filter (OpenCV, \~15 seconds (CPU)
  all 3600 frames)       

  Scene description ---  \~7-8 minutes (parallelised to \~2 min with 4
  Vision LLM (540 frames workers)
  @ \~0.8s each)         

  Session evaluation --- \~10-20 calls per hour video @ 1s each =
  LLM calls              negligible

  Embedding events (avg  \~5 seconds
  50 events)             

  Total end-to-end (1hr  \~3-4 minutes with 4 workers
  video)                 
  ---------------------- ------------------------------------------------

**10.2 LLM Cost (1hr video)**

  ---------------------- ------------------------------------------------
  **LLM call type**      **Estimated cost**

  Scene description ---  \~\$1.08
  540 frames × \$0.002   
  (GPT-4o Vision)        

  Session evaluation --- \~\$0.20
  20 calls × \$0.01      
  (GPT-4o, small prompt) 

  Chat queries --- user  \~\$0.20
  asks 10 questions ×    
  \$0.02                 

  Embedding --- 50       \~\$0.001
  events × negligible    

  Total per 1hr video    \~\$1.50 --- \$2.00
  ---------------------- ------------------------------------------------

  ---------------- ------------------------------------------------------------
  **Cost           Swap scene description to Gemini 1.5 Flash
  optimisation**   (\$0.000075/image) → drops cost to \~\$0.10 per hour of
                   video. Use GPT-4o only for session evaluation where
                   reasoning depth matters.

  ---------------- ------------------------------------------------------------

**11. Repo & Docker Structure**

+-----------------------------------------------------------------------+
| visioniq/                                                             |
|                                                                       |
| ├── docker-compose.yml                                                |
|                                                                       |
| ├── .env                                                              |
|                                                                       |
| ├── rules/                                                            |
|                                                                       |
| │ ├── packs/                                                          |
|                                                                       |
| │ │ ├── home.yaml                                                     |
|                                                                       |
| │ │ ├── school.yaml                                                   |
|                                                                       |
| │ │ └── office.yaml                                                   |
|                                                                       |
| │ └── custom/ \# per-camera custom rules                              |
|                                                                       |
| ├── services/                                                         |
|                                                                       |
| │ ├── api-gateway/                                                    |
|                                                                       |
| │ │ ├── main.py \# FastAPI: upload, jobs, profiles, rules             |
|                                                                       |
| │ │ ├── routers/                                                      |
|                                                                       |
| │ │ │ ├── jobs.py                                                     |
|                                                                       |
| │ │ │ ├── profiles.py                                                 |
|                                                                       |
| │ │ │ └── rules.py                                                    |
|                                                                       |
| │ │ └── Dockerfile                                                    |
|                                                                       |
| │ ├── video-processor/                                                |
|                                                                       |
| │ │ ├── worker.py \# queue consumer                                   |
|                                                                       |
| │ │ ├── extractor.py \# ffmpeg-python logic                           |
|                                                                       |
| │ │ └── Dockerfile                                                    |
|                                                                       |
| │ ├── motion-filter/                                                  |
|                                                                       |
| │ │ ├── worker.py                                                     |
|                                                                       |
| │ │ ├── detector.py \# OpenCV MOG2                                    |
|                                                                       |
| │ │ └── Dockerfile                                                    |
|                                                                       |
| │ ├── scene-describer/                                                |
|                                                                       |
| │ │ ├── worker.py                                                     |
|                                                                       |
| │ │ ├── vision_llm.py \# GPT-4o / Gemini abstraction                  |
|                                                                       |
| │ │ └── Dockerfile                                                    |
|                                                                       |
| │ ├── session-manager/                                                |
|                                                                       |
| │ │ ├── worker.py                                                     |
|                                                                       |
| │ │ ├── session.py \# open/close/append/timer logic                   |
|                                                                       |
| │ │ └── Dockerfile                                                    |
|                                                                       |
| │ ├── rule-retriever/                                                 |
|                                                                       |
| │ │ ├── worker.py                                                     |
|                                                                       |
| │ │ ├── retriever.py \# embed + Qdrant search                         |
|                                                                       |
| │ │ └── Dockerfile                                                    |
|                                                                       |
| │ ├── session-evaluator/                                              |
|                                                                       |
| │ │ ├── worker.py                                                     |
|                                                                       |
| │ │ ├── evaluator.py \# LLM evaluation + verdict parse                |
|                                                                       |
| │ │ ├── prompts.py                                                    |
|                                                                       |
| │ │ └── Dockerfile                                                    |
|                                                                       |
| │ ├── identity-service/                                               |
|                                                                       |
| │ │ ├── worker.py                                                     |
|                                                                       |
| │ │ ├── face_matcher.py \# DeepFace + Qdrant                          |
|                                                                       |
| │ │ └── Dockerfile                                                    |
|                                                                       |
| │ ├── event-writer/                                                   |
|                                                                       |
| │ │ ├── worker.py                                                     |
|                                                                       |
| │ │ ├── writer.py \# Postgres + Qdrant + S3                           |
|                                                                       |
| │ │ └── Dockerfile                                                    |
|                                                                       |
| │ ├── alert-service/                                                  |
|                                                                       |
| │ │ ├── worker.py                                                     |
|                                                                       |
| │ │ ├── telegram.py                                                   |
|                                                                       |
| │ │ └── Dockerfile                                                    |
|                                                                       |
| │ └── chat-api/                                                       |
|                                                                       |
| │ ├── main.py \# POST /chat, GET /report/weekly                       |
|                                                                       |
| │ ├── retriever.py \# Qdrant + Postgres RAG                           |
|                                                                       |
| │ ├── llm.py                                                          |
|                                                                       |
| │ ├── report.py \# weekly report aggregation                          |
|                                                                       |
| │ └── Dockerfile                                                      |
|                                                                       |
| └── shared/                                                           |
|                                                                       |
| ├── db.py \# Postgres pool                                            |
|                                                                       |
| ├── queue.py \# Redis Streams wrapper                                 |
|                                                                       |
| ├── storage.py \# S3/MinIO wrapper                                    |
|                                                                       |
| ├── qdrant_client.py                                                  |
|                                                                       |
| └── models.py \# Pydantic schemas (Job, Event, Session, Rule,         |
| Profile)                                                              |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| \# docker-compose.yml --- services summary                            |
|                                                                       |
| services:                                                             |
|                                                                       |
| api-gateway: ports: 8000 depends: redis, postgres, minio              |
|                                                                       |
| video-processor: replicas: 1 depends: redis, minio                    |
|                                                                       |
| motion-filter: replicas: 2 depends: redis                             |
|                                                                       |
| scene-describer: replicas: 4 depends: redis \# most parallelism here  |
|                                                                       |
| session-manager: replicas: 1 depends: redis, postgres                 |
|                                                                       |
| rule-retriever: replicas: 2 depends: redis, qdrant                    |
|                                                                       |
| session-evaluator: replicas: 2 depends: redis, postgres               |
|                                                                       |
| identity-service: replicas: 2 depends: redis, qdrant                  |
|                                                                       |
| event-writer: replicas: 1 depends: postgres, qdrant, minio            |
|                                                                       |
| alert-service: replicas: 1 depends: redis                             |
|                                                                       |
| chat-api: ports: 8001 depends: postgres, qdrant                       |
|                                                                       |
| postgres: image: postgres:16-alpine                                   |
|                                                                       |
| redis: image: redis:7-alpine                                          |
|                                                                       |
| qdrant: image: qdrant/qdrant ports: 6333                              |
|                                                                       |
| minio: image: minio/minio ports: 9000                                 |
+-----------------------------------------------------------------------+
