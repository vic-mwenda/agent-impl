import 'dotenv/config';

export const config = {
    groq: {
        apiKey: process.env.GROQ_API_KEY,
        model: 'openai/gpt-oss-20b'
    },
    pinecone: {
        apiKey: process.env.PINECONE_API_KEY,
        index: process.env.PINECONE_INDEX
    },
    embeddings: {
        model: 'Xenova/all-MiniLM-L6-v2'
    }
};
