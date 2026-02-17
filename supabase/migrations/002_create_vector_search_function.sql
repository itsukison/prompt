-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION match_memories(
    query_embedding vector(768),
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
