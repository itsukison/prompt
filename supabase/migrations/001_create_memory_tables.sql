-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Add memory_enabled column to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS memory_enabled BOOLEAN DEFAULT true;

-- Create user_memories table
CREATE TABLE IF NOT EXISTS user_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('personal_info', 'communication_style', 'preferences', 'work_context')),
    embedding vector(768), -- Gemini text-embedding-004 produces 768-dimensional vectors
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create memory_sessions table
CREATE TABLE IF NOT EXISTS memory_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_data JSONB NOT NULL DEFAULT '[]',
    analyzed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_category ON user_memories(category);
CREATE INDEX IF NOT EXISTS idx_user_memories_is_active ON user_memories(is_active);
CREATE INDEX IF NOT EXISTS idx_memory_sessions_user_id ON memory_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_sessions_analyzed ON memory_sessions(analyzed);

-- Create vector similarity search index using HNSW (Hierarchical Navigable Small World)
CREATE INDEX IF NOT EXISTS idx_user_memories_embedding ON user_memories 
USING hnsw (embedding vector_cosine_ops);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to user_memories
DROP TRIGGER IF EXISTS update_user_memories_updated_at ON user_memories;
CREATE TRIGGER update_user_memories_updated_at 
    BEFORE UPDATE ON user_memories 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own memories
CREATE POLICY "Users can view their own memories" 
    ON user_memories FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memories" 
    ON user_memories FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories" 
    ON user_memories FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories" 
    ON user_memories FOR DELETE 
    USING (auth.uid() = user_id);

-- Users can only access their own sessions
CREATE POLICY "Users can view their own sessions" 
    ON memory_sessions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" 
    ON memory_sessions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
    ON memory_sessions FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" 
    ON memory_sessions FOR DELETE 
    USING (auth.uid() = user_id);
