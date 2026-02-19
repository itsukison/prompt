/**
 * Memory Service - Session Analysis for Facts
 *
 * This service handles analyzing user sessions to extract facts.
 * The RAG-based getRelevantMemories is removed - facts are now always injected.
 */

const { getFactCount, getAllFacts, addFact, summarizeFact, isDuplicateFact, MAX_FACTS } = require('./facts-service');

/**
 * Analyze a session's interactions and extract facts about the user
 * @param {GoogleGenerativeAI} genAI
 * @param {object} supabase
 * @param {object} userProfile
 * @param {object} session - { interactions: [], startedAt: string }
 */
async function analyzeSessionForFacts(genAI, supabase, userProfile, session) {
    if (!genAI || !supabase || !userProfile) {
        console.log('[Facts] Skipping analysis: prerequisites not met');
        return;
    }
    if (userProfile.memory_enabled === false) {
        console.log('[Facts] Memory disabled for user, skipping analysis');
        return;
    }

    try {
        // Fetch existing facts once — used for both slot counting and dedup checks
        const existingFacts = await getAllFacts(supabase, userProfile.id);
        const remainingSlots = MAX_FACTS - existingFacts.length;

        if (remainingSlots <= 0) {
            console.log(`[Facts] User already has ${MAX_FACTS} facts, skipping extraction`);
            return;
        }

        console.log(`[Facts] Analyzing session (${session.interactions.length} interactions, ${remainingSlots} slots available)`);

        const conversationText = session.interactions
            .map((interaction, i) => `[${i + 1}] User: ${interaction.prompt}\nAssistant: ${interaction.response}`)
            .join('\n\n');

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
        const analysisPrompt = `Analyze this conversation and extract useful facts about the user that would help personalize future interactions.

Conversation:
${conversationText}

Extract up to ${remainingSlots} fact(s) about the user. Each fact should be:
- A single, concise sentence (under 150 characters)
- Something concrete and useful (name, role, preferences, communication style, etc.)
- Not obvious or generic

Examples of good facts:
- "The user's name is Alex Chen"
- "They prefer casual, friendly communication"
- "They work at TechCorp as a product manager"
- "They like using bullet points in emails"

If nothing useful to remember, return an empty array.

Return ONLY a JSON array of strings. Each string is one fact.
Example: ["The user's name is Alex Chen", "They prefer casual communication"]

Return ONLY valid JSON, no other text.`;

        const result = await model.generateContent(analysisPrompt);
        const responseText = result.response.text().trim();

        let facts = [];
        try {
            const jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            facts = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('[Facts] Failed to parse LLM response as JSON:', parseError.message);
            console.error('[Facts] Raw response:', responseText.substring(0, 200));
            return;
        }

        if (!Array.isArray(facts) || facts.length === 0) {
            console.log('[Facts] No useful facts extracted from session');
            return;
        }

        // Limit to remaining slots
        facts = facts.slice(0, remainingSlots);
        console.log(`[Facts] Extracted ${facts.length} potential fact(s)`);

        // Track facts added this run so intra-batch duplicates are also caught
        const factsInScope = [...existingFacts];
        let savedCount = 0;

        for (const factContent of facts) {
            if (typeof factContent !== 'string' || !factContent.trim()) continue;

            try {
                const summarized = await summarizeFact(genAI, factContent.trim());

                const duplicate = await isDuplicateFact(genAI, summarized, factsInScope);
                if (duplicate) {
                    console.log(`[Facts] Skipped duplicate: "${summarized.substring(0, 60)}..."`);
                    continue;
                }

                const savedFact = await addFact(supabase, userProfile.id, summarized, 'auto');
                if (savedFact) {
                    console.log(`[Facts] Saved: "${summarized.substring(0, 60)}${summarized.length > 60 ? '...' : ''}"`);
                    factsInScope.push(savedFact);
                    savedCount++;
                }
            } catch (error) {
                console.error('[Facts] Failed to save fact:', error.message);
            }
        }

        console.log(`[Facts] Session analysis complete. Saved ${savedCount} fact(s).`);
    } catch (error) {
        console.error('[Facts] Session analysis failed:', error.message);
    }
}

module.exports = { analyzeSessionForFacts };
