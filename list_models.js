const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '/Users/itsukison/Desktop/openclaw/promptOS/prompt/.env' });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('API key not found');
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' }); // Dummy model init to get client? No, need to verify how to list.
        // Actually, looking at docs or patterns, typically it is a separate call on the client or via REST if SDK doesn't expose it easily.
        // Let's try to just use a known working model `text-embedding-004` first as a test, or simple REST call.
        // But since the user asked to "Call ListModels", let's try to do that.

        // The node SDK might not expose listModels directly on the main class in older versions, but let's try standard approach or use REST.
        console.log('Listing models via REST to be sure...');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log('Available models:');
            data.models.forEach(m => {
                if (m.name.includes('embedding')) {
                    console.log(`- ${m.name} (${m.description})`);
                    console.log(`  Supported methods: ${m.supportedGenerationMethods}`);
                }
            });
        } else {
            console.log('No models found or error:', data);
        }
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
