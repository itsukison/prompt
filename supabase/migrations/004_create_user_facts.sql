-- Migration: Create user_facts table for simplified "10 facts" memory system
-- This replaces the complex RAG-based user_memories system

-- Create the user_facts table
CREATE TABLE IF NOT EXISTS user_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    source TEXT DEFAULT 'auto',  -- 'auto' (AI-extracted) or 'manual' (user-added)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Enforce max 10 facts per user (positions 0-9)
    CONSTRAINT position_range CHECK (position >= 0 AND position < 10),
    -- Enforce max content length
    CONSTRAINT content_max_length CHECK (char_length(content) <= 200),
    -- Ensure unique positions per user
    CONSTRAINT unique_user_position UNIQUE (user_id, position)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_facts_user_id ON user_facts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_facts_user_position ON user_facts(user_id, position);

-- Add updated_at trigger (reuse existing function if available)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_facts_updated_at
    BEFORE UPDATE ON user_facts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE user_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own facts"
    ON user_facts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own facts"
    ON user_facts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own facts"
    ON user_facts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own facts"
    ON user_facts FOR DELETE
    USING (auth.uid() = user_id);

-- Helper function to get next available position for a user
CREATE OR REPLACE FUNCTION get_next_fact_position(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_pos INTEGER;
BEGIN
    -- Find the smallest available position (gap-filling)
    SELECT MIN(pos) INTO next_pos
    FROM generate_series(0, 9) AS pos
    WHERE pos NOT IN (
        SELECT position FROM user_facts WHERE user_id = p_user_id
    );

    -- If no gaps, return -1 (at capacity)
    IF next_pos IS NULL THEN
        RETURN -1;
    END IF;

    RETURN next_pos;
END;
$$ LANGUAGE plpgsql;

-- Helper function to reorder facts after deletion
CREATE OR REPLACE FUNCTION reorder_facts_after_delete()
RETURNS TRIGGER AS $$
DECLARE
    r RECORD;
    new_position INTEGER := 0;
BEGIN
    -- Reorder all remaining facts for the user
    FOR r IN
        SELECT id FROM user_facts
        WHERE user_id = OLD.user_id
        ORDER BY position
    LOOP
        UPDATE user_facts SET position = new_position WHERE id = r.id;
        new_position := new_position + 1;
    END LOOP;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reorder_facts_on_delete
    AFTER DELETE ON user_facts
    FOR EACH ROW
    EXECUTE FUNCTION reorder_facts_after_delete();
