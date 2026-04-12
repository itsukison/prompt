# Memory System (10 Facts)

## Overview

The memory system stores up to 10 concise facts about the user that are always injected into every prompt. This provides personalization without the complexity of semantic search.

## Features

- **10 Fact Limit**: Maximum of 10 facts per user
- **Always Injected**: All facts included in every prompt (no semantic search)
- **Auto-Learning**: AI extracts facts from sessions (stops when 10 reached)
- **Manual Control**: Add, edit, delete facts via Settings
- **Concise**: Facts are auto-summarized to 200 characters max

## How It Works

### Fact Injection

Every text generation includes all user facts:
```
Here are facts about the user to help personalize responses:
- The user's name is Alex Chen
- They prefer casual, friendly communication
- They work at TechCorp as a product manager
```

### Auto-Extraction

When you quit the app (with 2+ interactions in the session):
1. Gemini analyzes the session conversation
2. Extracts up to `remaining slots` facts
3. Summarizes long facts to fit 200 char limit
4. Saves with source='auto'

**Note**: Extraction is skipped entirely when 10 facts are already saved.

### Manual Management

In Settings > Memory:
- Toggle memory on/off
- View capacity (X/10 progress bar)
- Add facts manually
- Edit existing facts
- Delete facts

## Database Schema

```sql
CREATE TABLE user_facts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    content TEXT NOT NULL,        -- Max 200 chars
    position INTEGER NOT NULL,    -- 0-9
    source TEXT DEFAULT 'auto',   -- 'auto' | 'manual'
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

## File Structure

```
src/
├── services/
│   ├── facts-service.js      # Core facts operations
│   └── memory-service.js     # Session analysis
├── ipc/
│   └── memory-handlers.js    # IPC handlers (facts:* and memory:*)
└── renderer/
    └── components/main-window/settings/
        ├── MemoryTab.tsx     # UI component
        └── hooks/useMemory.ts # React hook
```

## API

### IPC Channels

| Channel | Description |
|---------|-------------|
| `facts:get-all` | Get all facts ordered by position |
| `facts:add` | Add a new fact (returns null if at capacity) |
| `facts:update` | Update fact content |
| `facts:delete` | Delete a fact (positions reorder) |
| `facts:toggle` | Enable/disable memory system |
| `facts:get-stats` | Get { count, max, remaining } |

### Facts Service

```javascript
const { getAllFacts, addFact, updateFact, deleteFact,
        formatFactsForPrompt, summarizeFact } = require('./services/facts-service');

// Always inject all facts
const facts = await getAllFacts(supabase, userId);
const context = formatFactsForPrompt(facts);
// → "Here are facts about the user...\n- fact1\n- fact2"
```
