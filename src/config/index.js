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
    },
    database: {
        type: process.env.DB_TYPE || 'mysql',
        mysql: {
            host: process.env.MYSQL_HOST || 'localhost',
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            port: parseInt(process.env.MYSQL_PORT || '3306', 10)
        }
    }
};
        
