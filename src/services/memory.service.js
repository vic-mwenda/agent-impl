import { Pinecone } from '@pinecone-database/pinecone';
import { pipeline } from '@xenova/transformers';
import { config } from '../config/index.js';

class MemoryService {
    constructor() {
        this.pinecone = new Pinecone({ apiKey: config.pinecone.apiKey });
        this.index = this.pinecone.index(config.pinecone.index);
        this.embedder = null;
    }

    async loadEmbedder() {
        if (!this.embedder) {
            console.log('Loading local embedding model...');
            this.embedder = await pipeline('feature-extraction', config.embeddings.model);
        }
        return this.embedder;
    }

    async embedText(text) {
        const extractor = await this.loadEmbedder();
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }

    async store(userInput, response) {
        const combinedText = `User: ${userInput}\nGroq: ${response}`;
        const vector = await this.embedText(combinedText);
        await this.index.upsert([
            {
                id: `${Date.now()}`,
                values: vector,
                metadata: { text: combinedText },
            },
        ]);
    }

    async retrieve(query, topK = 3) {
        const queryVec = await this.embedText(query);
        const result = await this.index.query({
            vector: queryVec,
            topK,
            includeMetadata: true,
        });
        return result.matches.map(match => match.metadata.text).join('\n');
    }
}

export const memoryService = new MemoryService();
