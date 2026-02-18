const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '/Users/itsukison/Desktop/openclaw/promptOS/prompt/.env' });

async function testEmbedding() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('API key not found');
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        const model = genAI.getGenerativeModel({ model: 'models/text-embedding-004' });
        const text = "Hello world";
        const result = await model.embedContent(text);
        console.log(`Embedding generated successfully! Vector length: ${result.embedding.values.length}`);
    } catch (error) {
        console.error('Error generating embedding:', error);
    }
}

testEmbedding();
