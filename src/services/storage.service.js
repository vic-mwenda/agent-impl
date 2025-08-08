import fs from 'fs/promises';
import path from 'path';

class StorageService {
    constructor() {
        this.storagePath = path.join(process.cwd(), '.sessions');
    }

    async initialize() {
        try {
            await fs.access(this.storagePath);
        } catch {
            await fs.mkdir(this.storagePath, { recursive: true });
        }
    }

    async saveSession(sessionData) {
        const filePath = path.join(this.storagePath, `${sessionData.id}.json`);
        
        // Convert dates to ISO strings for proper serialization
        const serializedData = {
            ...sessionData,
            createdAt: sessionData.createdAt.toISOString(),
            lastAccessedAt: sessionData.lastAccessedAt.toISOString()
        };
        
        await fs.writeFile(
            filePath,
            JSON.stringify(serializedData, null, 2),
            'utf-8'
        );
    }

    async loadSession(sessionId) {
        const filePath = path.join(this.storagePath, `${sessionId}.json`);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            const sessionData = JSON.parse(data);
            
            // Convert ISO strings back to Date objects
            return {
                ...sessionData,
                createdAt: new Date(sessionData.createdAt),
                lastAccessedAt: new Date(sessionData.lastAccessedAt)
            };
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }

    async deleteSession(sessionId) {
        const filePath = path.join(this.storagePath, `${sessionId}.json`);
        try {
            await fs.unlink(filePath);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }

    async listSessions() {
        try {
            const files = await fs.readdir(this.storagePath);
            return files
                .filter(file => file.endsWith('.json'))
                .map(file => file.replace('.json', ''));
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    async saveActiveSessionId(sessionId) {
        const metaPath = path.join(this.storagePath, 'meta.json');
        await fs.writeFile(
            metaPath,
            JSON.stringify({ activeSessionId: sessionId }, null, 2),
            'utf-8'
        );
    }

    async loadActiveSessionId() {
        const metaPath = path.join(this.storagePath, 'meta.json');
        try {
            const data = await fs.readFile(metaPath, 'utf-8');
            const meta = JSON.parse(data);
            return meta.activeSessionId;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }
}

export const storageService = new StorageService();
