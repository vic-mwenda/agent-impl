import { v4 as uuidv4 } from 'uuid';
import { storageService } from './storage.service.js';

class Session {
    constructor(name = '', data = null) {
        if (data) {
            Object.assign(this, data);
        } else {
            this.id = uuidv4();
            this.name = name || `Session ${this.id.slice(0, 8)}`;
            this.messages = [];
            this.createdAt = new Date();
            this.lastAccessedAt = new Date();
            this.metadata = {};
        }
    }

    addMessage(role, content, toolCalls = null) {
        const message = { role, content };
        if (toolCalls) {
            message.tool_calls = toolCalls;
        }
        this.messages.push(message);
        this.lastAccessedAt = new Date();
        this._save();
    }

    getMessages() {
        return this.messages;
    }

    async clear() {
        this.messages = [];
        this.lastAccessedAt = new Date();
        await this._save();
    }

    setMetadata(key, value) {
        this.metadata[key] = value;
        this._save();
    }

    getMetadata(key) {
        return this.metadata[key];
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            messages: this.messages,
            createdAt: this.createdAt,
            lastAccessedAt: this.lastAccessedAt,
            metadata: this.metadata
        };
    }

    async _save() {
        await storageService.saveSession(this.toJSON());
    }
}

class SessionService {
    constructor() {
        this.sessions = new Map();
        this.activeSessionId = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        await storageService.initialize();
        
        // Load active session ID
        this.activeSessionId = await storageService.loadActiveSessionId();
        
        // Load all saved sessions
        const sessionIds = await storageService.listSessions();
        for (const sessionId of sessionIds) {
            const sessionData = await storageService.loadSession(sessionId);
            if (sessionData) {
                const session = new Session(sessionData.name, sessionData);
                this.sessions.set(sessionId, session);
            }
        }

        // If no sessions exist or active session not found, create default
        if (this.sessions.size === 0 || !this.activeSessionId || !this.sessions.has(this.activeSessionId)) {
            await this.createSession('Default Session');
        }

        this.initialized = true;
    }

    async createSession(name = '') {
        await this.ensureInitialized();
        const session = new Session(name);
        this.sessions.set(session.id, session);
        this.activeSessionId = session.id;
        await storageService.saveActiveSessionId(session.id);
        await session._save();
        return session;
    }

    async getSession(sessionId) {
        await this.ensureInitialized();
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        return session;
    }

    async getActiveSession() {
        await this.ensureInitialized();
        if (!this.activeSessionId) {
            return this.createSession();
        }
        return this.getSession(this.activeSessionId);
    }

    async switchSession(sessionId) {
        await this.ensureInitialized();
        if (!this.sessions.has(sessionId)) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        this.activeSessionId = sessionId;
        await storageService.saveActiveSessionId(sessionId);
        return this.getSession(sessionId);
    }

    async listSessions() {
        await this.ensureInitialized();
        return Array.from(this.sessions.values()).map(session => ({
            id: session.id,
            name: session.name,
            messageCount: session.messages.length,
            createdAt: session.createdAt,
            lastAccessedAt: session.lastAccessedAt,
            isActive: session.id === this.activeSessionId
        }));
    }

    async deleteSession(sessionId) {
        await this.ensureInitialized();
        if (!this.sessions.has(sessionId)) {
            throw new Error(`Session not found: ${sessionId}`);
        }

        // Delete from storage first
        await storageService.deleteSession(sessionId);

        if (sessionId === this.activeSessionId) {
            // If deleting active session, switch to another one or create new
            const remainingSessions = Array.from(this.sessions.keys())
                .filter(id => id !== sessionId);
            
            if (remainingSessions.length > 0) {
                await this.switchSession(remainingSessions[0]);
            } else {
                await this.createSession();
            }
        }

        this.sessions.delete(sessionId);
    }

    async clearSession(sessionId) {
        const session = await this.getSession(sessionId);
        await session.clear();
        return session;
    }

    async ensureInitialized() {
        if (!this.initialized) {
            await this.initialize();
        }
    }
}

export const sessionService = new SessionService();