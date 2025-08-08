import { BaseTool } from './base.tool.js';
import { sessionService } from '../services/session.service.js';

export class SessionManagerTool extends BaseTool {
    get name() {
        return 'manage_session';
    }

    get description() {
        return 'Manages conversation sessions, allowing creation, switching, and listing of sessions';
    }

    get parameters() {
        return {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['create', 'switch', 'list', 'delete', 'clear'],
                    description: 'The session management action to perform'
                },
                session_name: {
                    type: 'string',
                    description: 'For create action: Name of the new session'
                },
                session_id: {
                    type: 'string',
                    description: 'For switch/delete/clear actions: ID of the target session'
                }
            },
            required: ['action']
        };
    }

    async execute(params) {
        try {
            switch (params.action) {
                case 'create': {
                    const session = sessionService.createSession(params.session_name);
                    return {
                        success: true,
                        action: 'create',
                        session: {
                            id: session.id,
                            name: session.name
                        }
                    };
                }

                case 'switch': {
                    if (!params.session_id) {
                        throw new Error('session_id is required for switch action');
                    }
                    const session = sessionService.switchSession(params.session_id);
                    return {
                        success: true,
                        action: 'switch',
                        session: {
                            id: session.id,
                            name: session.name
                        }
                    };
                }

                case 'list': {
                    const sessions = sessionService.listSessions();
                    return {
                        success: true,
                        action: 'list',
                        sessions: sessions
                    };
                }

                case 'delete': {
                    if (!params.session_id) {
                        throw new Error('session_id is required for delete action');
                    }
                    sessionService.deleteSession(params.session_id);
                    return {
                        success: true,
                        action: 'delete',
                        session_id: params.session_id
                    };
                }

                case 'clear': {
                    if (!params.session_id) {
                        throw new Error('session_id is required for clear action');
                    }
                    const session = sessionService.clearSession(params.session_id);
                    return {
                        success: true,
                        action: 'clear',
                        session: {
                            id: session.id,
                            name: session.name
                        }
                    };
                }

                default:
                    throw new Error(`Unknown action: ${params.action}`);
            }
        } catch (error) {
            throw new Error(`Session management failed: ${error.message}`);
        }
    }
}
