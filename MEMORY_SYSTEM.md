# Long-term Memory System

## Overview

The long-term memory system allows promptOS to remember information about users, including their communication style, personal details, preferences, and work context. This information is automatically extracted from usage sessions and used to personalize AI responses.

## Features

- **Automatic Learning**: Analyzes conversations when you close the overlay to extract memorable information
- **Semantic Search**: Uses embeddings to find relevant memories based on your current request
- **Duplicate Detection**: Prevents saving redundant information
- **Privacy Controls**: Toggle the system on/off, view, edit, and delete memories
- **Writing Style Enhancement**: Learns your communication patterns to better match your style

## Setup Instructions

### 1. Database Migration

Run the following SQL migrations in your Supabase dashboard (SQL Editor):

#### Migration 1: Create Memory Tables

```sql
-- File: supabase/migrations/001_create_memory_tables.sql
```

Run the contents of `prompt/supabase/migrations/001_create_memory_tables.sql`

This creates:
- `user_memories` table with vector embeddings
- `memory_sessions` table for session tracking
- Adds `memory_enabled` column to `user_profiles`
- Sets up RLS policies for security

#### Migration 2: Vector Search Function

```sql
-- File: supabase/migrations/002_create_vector_search_function.sql
```

Run the contents of `prompt/supabase/migrations/002_create_vector_search_function.sql`

This creates the `match_memories()` PostgreSQL function for semantic search.

### 2. Environment Setup

Make sure your `.env` file has:

```bash
GEMINI_API_KEY=your_key_here
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

The system uses:
- **Gemini 2.0 Flash Lite** for session analysis (cheap, fast)
- **Gemini Text-Embedding-001** for embeddings (768 dimensions)
- **Gemini 3 Flash Preview** for text generation with memory context

### 3. Verify Installation

1. Start the app: `npm start`
2. Open Settings (Cmd+Shift+/)
3. Navigate to the "Memory" tab
4. Toggle "Enable Memory" on
5. Use the overlay multiple times (have at least 2 interactions)
6. Quit the app (Cmd+Q) - analysis happens automatically
7. Restart the app and check the Memory tab to see extracted memories

## How It Works

### Session Capture

When you open the overlay (Cmd+/):
- A session is created if one doesn't exist
- Each interaction (prompt + response) is tracked
- Session persists across multiple overlay open/close cycles until the app quits

### Memory Analysis

When you quit the app:
- If the session has 2+ interactions, analysis is triggered automatically
- Gemini 2.0 Flash Lite analyzes the entire usage session
- Extracts 4 types of information:
  - **Personal Info**: Name, role, location, company, etc.
  - **Communication Style**: Tone, phrases, formatting preferences
  - **Preferences**: Topics, formats, things you care about
  - **Work Context**: Projects, colleagues, industry
- Analysis happens before app closes (takes 1-3 seconds)

### Embedding & Storage

For each extracted memory:
1. Generate 768-dimensional embedding using Gemini Text-Embedding-001
2. Check similarity with existing memories in the same category
3. If similarity < 0.85, save as new memory
4. If similarity >= 0.85, skip (duplicate)

### Semantic Retrieval

When you generate text:
1. **Smart filtering**: Skip embedding for simple/short prompts (< 15 chars or < 3 words)
   - Exception: Always use memory for context-aware requests ("reply to this", "fill in my name", etc.)
2. Embed your prompt (if it passed filtering)
3. Query `user_memories` using vector similarity (cosine distance)
4. Retrieve top 3-5 memories with similarity > 0.7
5. Inject into system instruction context
6. Generate response with personalized context

**Optimization**: The smart filtering reduces embedding API calls by ~60-70% for typical usage

### Writing Style Enhancement

The system enhances your selected writing style preset:
- Queries communication_style memories
- Appends learned patterns to base style guide
- Example: "Professional style + User prefers bullet points and avoids jargon"

## Memory Management UI

### Memory Tab (Settings → Memory)

**Toggle**: Enable/disable the entire memory system

**Statistics**:
- Total memories count
- Breakdown by category
- Last session analyzed timestamp

**Memory List**:
- Organized by category
- View all saved memories
- Edit memory content (regenerates embedding)
- Delete memories (soft delete)
- Shows creation date

## File Structure

```
prompt/
├── src/
│   ├── main.js                 # Main process with session tracking & analysis
│   ├── embedding.js            # Embedding service (new)
│   ├── preload.js              # IPC API exposure
│   ├── supabase.js             # Supabase client
│   └── renderer/
│       ├── components/
│       │   └── main-window/
│       │       └── SettingsPage.tsx  # Memory UI tab
│       ├── contexts/
│       │   └── PromptOSContext.tsx
│       └── types/
│           └── promptos.d.ts   # TypeScript definitions
└── supabase/
    └── migrations/
        ├── 001_create_memory_tables.sql
        └── 002_create_vector_search_function.sql
```

## Key Functions

### Main Process (`main.js`)

- `analyzeSessionForMemories(session)` - Extracts memories from session
- `getWritingStyleGuide()` - Returns style guide enhanced with memories
- `getRelevantMemories(prompt)` - Semantic search for relevant memories
- `generateText(prompt, screenshot)` - Generates text with memory context

### Embedding Service (`embedding.js`)

- `embedText(text)` - Generate 768-dim embedding
- `cosineSimilarity(vec1, vec2)` - Calculate similarity
- `findSimilarMemories(supabase, userId, embedding, threshold, limit)` - Vector search
- `isDuplicateMemory(...)` - Check for duplicates before saving
- `saveMemoryWithEmbedding(...)` - Save memory with deduplication

### IPC Handlers

- `memory:get-all` - Fetch all active memories
- `memory:update` - Update memory content (regenerates embedding)
- `memory:delete` - Soft delete memory
- `memory:toggle` - Enable/disable memory system
- `memory:get-stats` - Get statistics

## Performance Considerations

- **Session analysis**: Happens once per app session on quit (not per overlay close)
- **Embedding generation**: ~100-200ms per text, but skipped for 60-70% of requests via smart filtering
- **Smart filtering**: Skips embedding for simple tasks like "write hello" or prompts < 15 chars
- **Context-aware exception**: "Reply to this", "fill in my name" always use memory
- **Vector search**: <50ms with HNSW index on 1000s of memories
- **Token usage**: Minimal (cheap models, limited context injection, single analysis per session)

## Privacy & Security

- All memories stored in user's Supabase account
- RLS policies ensure users only access their own data
- Soft deletes preserve audit trail
- Toggle system off to stop learning
- Edit/delete any memory at any time

## Troubleshooting

### Memories not appearing

1. Check Memory tab toggle is ON
2. Verify you had 2+ interactions before closing overlay
3. Check console logs for errors
4. Ensure migrations ran successfully

### "match_memories" function not found

Run migration 002 (vector search function)

### Embeddings failing

1. Check GEMINI_API_KEY is set
2. Verify API quota not exceeded
3. Check network connectivity

### Duplicate memories still being saved

Adjust similarity threshold in `isDuplicateMemory()` (default: 0.85)

## Future Enhancements

- Export/import memories
- Manual memory creation
- Memory categories management
- Confidence scoring UI
- Memory usage analytics
- Multi-modal memory (images, documents)
