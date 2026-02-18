-- Cleanup: Drop old RAG-based memory system tables and functions
-- These are no longer needed after migrating to the simpler "10 facts" system

-- Drop the vector search function
DROP FUNCTION IF EXISTS match_memories CASCADE;

-- Drop the old tables (CASCADE will handle any dependent objects)
DROP TABLE IF EXISTS user_memories CASCADE;
DROP TABLE IF EXISTS memory_sessions CASCADE;
