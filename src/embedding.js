/**
 * Embedding service for semantic memory search using Gemini embeddings
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

let genAI = null;

/**
 * Initialize Gemini AI client
 */
function initEmbeddingClient() {
    if (genAI) return genAI;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('[Embedding] GEMINI_API_KEY not found');
        return null;
    }
    
    genAI = new GoogleGenerativeAI(apiKey);
    return genAI;
}

/**
 * Generate embedding vector for text using Gemini
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} - 768-dimensional embedding vector
 */
async function embedText(text) {
    if (!genAI) {
        genAI = initEmbeddingClient();
    }
    
    if (!genAI) {
        throw new Error('Gemini API not initialized');
    }
    
    try {
        const model = genAI.getGenerativeModel({
            model: 'models/text-embedding-001'
        });
        
        const result = await model.embedContent(text);
        const embedding = result.embedding;
        
        return embedding.values; // Array of 768 numbers
    } catch (error) {
        console.error('[Embedding] Failed to generate embedding:', error.message);
        throw error;
    }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {number[]} vec1 - First vector
 * @param {number[]} vec2 - Second vector
 * @returns {number} - Similarity score between -1 and 1
 */
function cosineSimilarity(vec1, vec2) {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) {
        throw new Error('Invalid vectors for similarity calculation');
    }
    
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
        dotProduct += vec1[i] * vec2[i];
        mag1 += vec1[i] * vec1[i];
        mag2 += vec2[i] * vec2[i];
    }
    
    mag1 = Math.sqrt(mag1);
    mag2 = Math.sqrt(mag2);
    
    if (mag1 === 0 || mag2 === 0) {
        return 0;
    }
    
    return dotProduct / (mag1 * mag2);
}

/**
 * Find similar memories using vector search
 * @param {Object} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {number[]} embedding - Query embedding vector
 * @param {number} threshold - Minimum similarity threshold (default 0.7)
 * @param {number} limit - Maximum number of results (default 5)
 * @returns {Promise<Array>} - Array of similar memories
 */
async function findSimilarMemories(supabase, userId, embedding, threshold = 0.7, limit = 5) {
    if (!supabase) {
        throw new Error('Supabase client not provided');
    }
    
    try {
        // Use pgvector's cosine distance search
        // Note: pgvector uses distance (0 = identical), so we convert from similarity
        const maxDistance = 1 - threshold;
        
        const { data, error } = await supabase.rpc('match_memories', {
            query_embedding: embedding,
            match_threshold: maxDistance,
            match_count: limit,
            filter_user_id: userId
        });
        
        if (error) {
            console.error('[Embedding] Vector search failed:', error.message);
            throw error;
        }
        
        return data || [];
    } catch (error) {
        console.error('[Embedding] findSimilarMemories failed:', error.message);
        throw error;
    }
}

/**
 * Check if a memory is a duplicate using similarity threshold
 * @param {Object} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} content - Memory content to check
 * @param {string} category - Memory category
 * @param {number} threshold - Similarity threshold for duplicates (default 0.85)
 * @returns {Promise<boolean>} - True if duplicate found
 */
async function isDuplicateMemory(supabase, userId, content, category, threshold = 0.85) {
    try {
        // Generate embedding for new content
        const embedding = await embedText(content);
        
        // Get all memories in same category
        const { data: existingMemories, error } = await supabase
            .from('user_memories')
            .select('id, content, embedding')
            .eq('user_id', userId)
            .eq('category', category)
            .eq('is_active', true);
        
        if (error) {
            console.error('[Embedding] Failed to fetch existing memories:', error.message);
            return false; // If we can't check, allow save
        }
        
        if (!existingMemories || existingMemories.length === 0) {
            return false; // No existing memories, not a duplicate
        }
        
        // Check similarity with each existing memory
        for (const memory of existingMemories) {
            if (!memory.embedding) continue;
            
            const similarity = cosineSimilarity(embedding, memory.embedding);
            
            if (similarity >= threshold) {
                console.log(`[Embedding] Duplicate detected (similarity: ${similarity.toFixed(3)})`);
                console.log(`  New: ${content.substring(0, 50)}...`);
                console.log(`  Existing: ${memory.content.substring(0, 50)}...`);
                return true;
            }
        }
        
        return false; // No duplicates found
    } catch (error) {
        console.error('[Embedding] Duplicate check failed:', error.message);
        return false; // If check fails, allow save
    }
}

/**
 * Save memory with embedding and duplicate check
 * @param {Object} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} content - Memory content
 * @param {string} category - Memory category
 * @param {Object} metadata - Additional metadata
 * @returns {Promise<Object>} - Saved memory or null if duplicate
 */
async function saveMemoryWithEmbedding(supabase, userId, content, category, metadata = {}) {
    try {
        // Check for duplicates
        const isDuplicate = await isDuplicateMemory(supabase, userId, content, category);
        
        if (isDuplicate) {
            console.log('[Embedding] Skipping duplicate memory');
            return null;
        }
        
        // Generate embedding
        const embedding = await embedText(content);
        
        // Save memory
        const { data, error } = await supabase
            .from('user_memories')
            .insert({
                user_id: userId,
                content,
                category,
                embedding,
                metadata,
                is_active: true
            })
            .select()
            .single();
        
        if (error) {
            console.error('[Embedding] Failed to save memory:', error.message);
            throw error;
        }
        
        console.log(`[Embedding] Saved memory: [${category}] ${content.substring(0, 50)}...`);
        return data;
    } catch (error) {
        console.error('[Embedding] saveMemoryWithEmbedding failed:', error.message);
        throw error;
    }
}

module.exports = {
    initEmbeddingClient,
    embedText,
    cosineSimilarity,
    findSimilarMemories,
    isDuplicateMemory,
    saveMemoryWithEmbedding
};
