-- Update vector size from 768 to 3072 for gemini-embedding-001
-- gemini-embedding-001 produces 3072-dimensional vectors (vs 768 for text-embedding-001)

-- Step 1: Drop the HNSW index — pgvector requires this before changing vector dimensions.
-- The index is tied to the original vector(768) type and cannot be altered in place.
DROP INDEX IF EXISTS idx_user_memories_embedding;

-- Step 2: Null out existing embeddings.
-- Existing rows contain 768-dim vectors which cannot be cast to vector(3072).
-- They will be re-embedded automatically on next use.
UPDATE user_memories SET embedding = NULL WHERE embedding IS NOT NULL;

-- Step 3: Change the column type to 3072 dimensions.
ALTER TABLE user_memories
ALTER COLUMN embedding TYPE vector(3072);

-- Step 4: No vector index recreated.
-- pgvector HNSW/IVFFlat indexes are capped at 2000 dims; gemini-embedding-001 produces 3072.
-- This is fine: the user_id B-tree index filters to a small per-user subset first,
-- so similarity scanning runs on a tiny result set (<100 rows per user).

-- Step 5: Update the match_memories function to accept 3072-dim vectors.
CREATE OR REPLACE FUNCTION match_memories(
    query_embedding vector(3072),
    match_threshold float,
    match_count int,
    filter_user_id uuid
)
RETURNS TABLE (
    id uuid,
    user_id uuid,
    content text,
    category text,
    metadata jsonb,
    is_active boolean,
    created_at timestamptz,
    updated_at timestamptz,
    similarity float
)
LANGUAGE sql STABLE
AS $$
    SELECT
        user_memories.id,
        user_memories.user_id,
        user_memories.content,
        user_memories.category,
        user_memories.metadata,
        user_memories.is_active,
        user_memories.created_at,
        user_memories.updated_at,
        1 - (user_memories.embedding <=> query_embedding) as similarity
    FROM user_memories
    WHERE
        user_memories.user_id = filter_user_id
        AND user_memories.is_active = true
        AND user_memories.embedding IS NOT NULL
        AND 1 - (user_memories.embedding <=> query_embedding) > (1 - match_threshold)
    ORDER BY user_memories.embedding <=> query_embedding
    LIMIT match_count;
$$;
