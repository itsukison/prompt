/**
 * Facts Service - Simplified memory system
 *
 * Replaces the complex RAG-based memory system with a simple "10 facts" approach:
 * - Max 10 concise facts per user
 * - All facts always injected into prompts (no semantic search)
 * - AI auto-extracts facts, stops when 10 reached
 */

const MAX_FACTS = 10;
const MAX_FACT_LENGTH = 200;

/**
 * Get all facts for a user, ordered by position
 * @param {object} supabase - Supabase client
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of facts
 */
async function getAllFacts(supabase, userId) {
    const { data, error } = await supabase
        .from('user_facts')
        .select('id, content, position, source, created_at')
        .eq('user_id', userId)
        .order('position', { ascending: true });

    if (error) {
        console.error('[Facts] Failed to fetch facts:', error.message);
        throw error;
    }
    return data || [];
}

/**
 * Get the count of facts for a user
 * @param {object} supabase - Supabase client
 * @param {string} userId - User ID
 * @returns {Promise<number>} Count of facts
 */
async function getFactCount(supabase, userId) {
    const { count, error } = await supabase
        .from('user_facts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

    if (error) {
        console.error('[Facts] Failed to count facts:', error.message);
        throw error;
    }
    return count || 0;
}

/**
 * Check if user can add more facts
 * @param {object} supabase - Supabase client
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if user has < 10 facts
 */
async function canAddFact(supabase, userId) {
    const count = await getFactCount(supabase, userId);
    return count < MAX_FACTS;
}

/**
 * Add a new fact for a user
 * @param {object} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} content - Fact content
 * @param {string} source - 'auto' or 'manual'
 * @returns {Promise<object|null>} The created fact, or null if at capacity
 */
async function addFact(supabase, userId, content, source = 'manual') {
    // Check capacity
    const count = await getFactCount(supabase, userId);
    if (count >= MAX_FACTS) {
        console.log(`[Facts] Cannot add: user already has ${MAX_FACTS} facts`);
        return null;
    }

    // Truncate if too long
    const truncatedContent = content.length > MAX_FACT_LENGTH
        ? content.substring(0, MAX_FACT_LENGTH - 3) + '...'
        : content;

    // Insert at next available position
    const { data, error } = await supabase
        .from('user_facts')
        .insert({
            user_id: userId,
            content: truncatedContent.trim(),
            position: count, // Next position
            source
        })
        .select()
        .single();

    if (error) {
        console.error('[Facts] Failed to add fact:', error.message);
        throw error;
    }

    console.log(`[Facts] Added fact at position ${count}: "${truncatedContent.substring(0, 50)}..."`);
    return data;
}

/**
 * Update an existing fact
 * @param {object} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} factId - Fact ID
 * @param {string} content - New content
 * @returns {Promise<object>} The updated fact
 */
async function updateFact(supabase, userId, factId, content) {
    // Truncate if too long
    const truncatedContent = content.length > MAX_FACT_LENGTH
        ? content.substring(0, MAX_FACT_LENGTH - 3) + '...'
        : content;

    const { data, error } = await supabase
        .from('user_facts')
        .update({
            content: truncatedContent.trim(),
            updated_at: new Date().toISOString()
        })
        .eq('id', factId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        console.error('[Facts] Failed to update fact:', error.message);
        throw error;
    }

    console.log(`[Facts] Updated fact ${factId}`);
    return data;
}

/**
 * Delete a fact (positions are reordered by DB trigger)
 * @param {object} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {string} factId - Fact ID
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteFact(supabase, userId, factId) {
    const { error } = await supabase
        .from('user_facts')
        .delete()
        .eq('id', factId)
        .eq('user_id', userId);

    if (error) {
        console.error('[Facts] Failed to delete fact:', error.message);
        throw error;
    }

    console.log(`[Facts] Deleted fact ${factId}`);
    return true;
}

/**
 * Format facts for injection into system instruction
 * @param {Array} facts - Array of fact objects
 * @returns {string} Formatted facts string, or empty string if no facts
 */
function formatFactsForPrompt(facts) {
    if (!facts || facts.length === 0) return '';

    const factsList = facts.map(f => `- ${f.content}`).join('\n');
    return `Identity facts (use ONLY for signing or closing a message e.g. "Best, [name]", or when the user explicitly asks to write about themselves. Never use these to shape the topic, scenario, or content of a response):\n${factsList}`;
}

/**
 * Check if a new fact meaningfully duplicates or contradicts an existing one
 * @param {object} genAI - Google Generative AI client
 * @param {string} newFact - Candidate fact to check
 * @param {Array} existingFacts - Array of existing fact objects
 * @returns {Promise<boolean>} True if duplicate/contradiction found
 */
async function isDuplicateFact(genAI, newFact, existingFacts) {
    if (!genAI || existingFacts.length === 0) return false;

    const existingList = existingFacts.map(f => `- ${f.content}`).join('\n');
    const prompt = `Existing facts:\n${existingList}\n\nNew fact: "${newFact}"\n\nDoes the new fact meaningfully duplicate or contradict any existing fact? Answer only YES or NO.`;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        const result = await model.generateContent(prompt);
        const answer = result.response.text().trim().toUpperCase();
        return answer.startsWith('YES');
    } catch (error) {
        console.error('[Facts] Duplicate check failed, allowing fact:', error.message);
        return false;
    }
}

/**
 * Summarize a fact if it's too long (using Gemini)
 * @param {object} genAI - Google Generative AI client
 * @param {string} content - Original fact content
 * @returns {Promise<string>} Summarized or original content
 */
async function summarizeFact(genAI, content) {
    if (content.length <= MAX_FACT_LENGTH) {
        return content;
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        const prompt = `Summarize this personal fact in under 150 characters while preserving the key information. Return only the summary, nothing else.

Fact: "${content}"

Summary:`;

        const result = await model.generateContent(prompt);
        const summary = result.response.text().trim();

        // Ensure the summary is within limits
        if (summary.length <= MAX_FACT_LENGTH) {
            console.log(`[Facts] Summarized fact: "${content.substring(0, 30)}..." -> "${summary.substring(0, 30)}..."`);
            return summary;
        }
        // Fallback to truncation if summary is still too long
        return content.substring(0, MAX_FACT_LENGTH - 3) + '...';
    } catch (error) {
        console.error('[Facts] Summarization failed:', error.message);
        // Fallback to truncation
        return content.substring(0, MAX_FACT_LENGTH - 3) + '...';
    }
}

module.exports = {
    MAX_FACTS,
    MAX_FACT_LENGTH,
    getAllFacts,
    getFactCount,
    canAddFact,
    addFact,
    updateFact,
    deleteFact,
    formatFactsForPrompt,
    summarizeFact,
    isDuplicateFact
};
