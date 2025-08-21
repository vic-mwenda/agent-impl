import { BaseTool } from './base.tool.js';
import { MySQLConnector } from '../services/database/mysql.connector.js';

export class DatabaseAnalysisTool extends BaseTool {
    constructor() {
        super();
        this.connector = null;
    }

    get name() {
        return 'database_analysis';
    }

    get description() {
        return 'Perform data analysis on database tables';
    }

    get parameters() {
        return {
            type: 'object',
            properties: {
                operation: {
                    type: 'string',
                    enum: ['connect', 'disconnect', 'analyze', 'list_tables', 'get_schema'],
                    description: 'The operation to perform'
                },
                config: {
                    type: 'object',
                    properties: {
                        type: { type: 'string', enum: ['mysql'] },
                        host: { type: 'string' },
                        user: { type: 'string' },
                        password: { type: 'string' },
                        database: { type: 'string' }
                    },
                    required: ['type']
                },
                analysis: {
                    type: 'object',
                    properties: {
                        type: { 
                            type: 'string',
                            enum: ['summary', 'distribution', 'correlation', 'custom']
                        },
                        table: { type: 'string' },
                        columns: { 
                            type: 'array',
                            items: { type: 'string' }
                        },
                        conditions: { type: 'string' },
                        groupBy: { type: 'string' },
                        having: { type: 'string' },
                        limit: { type: 'number' },
                        query: { type: 'string' },
                        params: { 
                            type: 'array',
                            items: { type: 'any' }
                        }
                    }
                },
                tableName: { type: 'string' }
            },
            required: ['operation']
        };
    }

    async execute(params) {
        const { operation, config, analysis, tableName } = params;

        try {
            switch (operation) {
                case 'connect':
                    return await this.handleConnect(config);
                
                case 'disconnect':
                    return await this.handleDisconnect();
                
                case 'analyze':
                    return await this.handleAnalysis(analysis);
                
                case 'list_tables':
                    return await this.handleListTables();
                
                case 'get_schema':
                    return await this.handleGetSchema(tableName);
                
                default:
                    throw new Error(`Unsupported operation: ${operation}`);
            }
        } catch (error) {
            throw new Error(`Database analysis failed: ${error.message}`);
        }
    }

    async handleConnect(config) {
        if (this.connector) {
            await this.connector.disconnect();
        }

        switch (config.type.toLowerCase()) {
            case 'mysql':
                this.connector = new MySQLConnector(config);
                break;
            default:
                throw new Error(`Unsupported database type: ${config.type}`);
        }

        await this.connector.connect();
        return {
            status: 'connected',
            type: config.type,
            database: config.database
        };
    }

    async handleDisconnect() {
        if (!this.connector) {
            return { status: 'already_disconnected' };
        }

        await this.connector.disconnect();
        this.connector = null;
        return { status: 'disconnected' };
    }

    async handleAnalysis(analysis) {
        if (!this.connector) {
            throw new Error('Database not connected');
        }

        return await this.connector.analyze(analysis);
    }

    async handleListTables() {
        if (!this.connector) {
            throw new Error('Database not connected');
        }

        const tables = await this.connector.listTables();
        return {
            tables,
            count: tables.length
        };
    }

    async handleGetSchema(tableName) {
        if (!this.connector) {
            throw new Error('Database not connected');
        }

        return await this.connector.getTableSchema(tableName);
    }
}