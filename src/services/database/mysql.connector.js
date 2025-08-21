import mysql from 'mysql2/promise';
import { BaseConnector } from './base.connector.js';
import { DatabaseMetadataManager } from './metadata.manager.js';

/**
 * MySQL specific implementation of the database connector
 */
export class MySQLConnector extends BaseConnector {
    constructor(config) {
        super(config);
        this.pool = null;
        this.metadataManager = new DatabaseMetadataManager();
    }

    /**
     * Initialize metadata for business intelligence
     * @param {Object} metadata Database metadata configuration
     */
    initializeMetadata(metadata) {
        const { tables, relationships, concepts, metrics } = metadata;
        
        // Register tables with their business context
        tables.forEach(table => this.metadataManager.registerTable(table));
        
        // Register relationships between tables
        relationships.forEach(rel => this.metadataManager.registerRelationship(rel));
        
        // Register business concepts
        concepts.forEach(concept => this.metadataManager.registerBusinessConcept(concept));
        
        // Register business metrics
        metrics.forEach(metric => this.metadataManager.registerMetric(metric));
    }

    /**
     * Initialize MySQL connection pool
     */
    async connect() {
        try {
            this.pool = await mysql.createPool({
                host: this.config.host,
                user: this.config.user,
                password: this.config.password,
                database: this.config.database,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0
            });
            this.connection = await this.pool.getConnection();
            this.connection.release();
        } catch (error) {
            throw new Error(`Failed to connect to MySQL: ${error.message}`);
        }
    }

    /**
     * Close MySQL connection pool
     */
    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            this.connection = null;
        }
    }

    /**
     * Execute a MySQL query
     */
    async query(query, params = []) {
        if (!this.pool) {
            throw new Error('Database connection not initialized');
        }
        try {
            const [results] = await this.pool.execute(query, params);
            return results;
        } catch (error) {
            throw new Error(`Query execution failed: ${error.message}`);
        }
    }

    /**
     * Get MySQL table schema
     */
    async getTableSchema(tableName) {
        const query = `
            SELECT 
                COLUMN_NAME as name,
                DATA_TYPE as type,
                IS_NULLABLE as nullable,
                COLUMN_KEY as key,
                COLUMN_DEFAULT as defaultValue,
                EXTRA as extra
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
        `;
        
        try {
            const results = await this.query(query, [this.config.database, tableName]);
            return {
                tableName,
                columns: results
            };
        } catch (error) {
            throw new Error(`Failed to get table schema: ${error.message}`);
        }
    }

    /**
     * List all tables in the database
     */
    async listTables() {
        const query = `
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ?
        `;
        
        try {
            const results = await this.query(query, [this.config.database]);
            return results.map(row => row.TABLE_NAME);
        } catch (error) {
            throw new Error(`Failed to list tables: ${error.message}`);
        }
    }

    /**
     * Perform data analysis on MySQL tables
     */
    async analyze(analysisConfig) {
        const { type, businessQuestion, table, columns, conditions, groupBy, having, limit } = analysisConfig;
        
        let query = '';
        let params = [];

        // If a business question is provided, use metadata to build the query
        if (businessQuestion) {
            const queryPlan = this.metadataManager.analyzeBusinessQuestion(businessQuestion);
            
            // Build the query based on the query plan
            const selectedTables = Array.from(queryPlan.tables);
            const mainTable = selectedTables[0];
            
            let joins = '';
            queryPlan.joins.forEach(join => {
                joins += `
                    JOIN ${join.targetTable} ON ${join.sourceTable}.${join.sourceKey} = ${join.targetTable}.${join.targetKey}`;
            });

            let metrics = '';
            queryPlan.metrics.forEach(metricName => {
                const metric = this.metadataManager.metadata.metrics.get(metricName);
                if (metric.type === 'SIMPLE') {
                    metrics += `${metric.calculation} as ${metricName}, `;
                } else if (metric.type === 'CALCULATED') {
                    metrics += `(${metric.calculation}) as ${metricName}, `;
                }
            });

            let filters = '';
            if (queryPlan.filters.length > 0) {
                filters = 'WHERE ' + queryPlan.filters.join(' AND ');
            }

            query = `
                SELECT ${metrics.slice(0, -2)}
                FROM ${mainTable}
                ${joins}
                ${filters}
                ${groupBy ? 'GROUP BY ' + groupBy : ''}
                ${having ? 'HAVING ' + having : ''}
                ${limit ? 'LIMIT ' + limit : ''}
            `;
        } else {
            // Original analysis logic for direct queries
            switch (type.toLowerCase()) {
                case 'summary':
                    query = `
                        SELECT 
                            ${columns.map(col => `
                                COUNT(${col}) as ${col}_count,
                                AVG(${col}) as ${col}_avg,
                                MIN(${col}) as ${col}_min,
                                MAX(${col}) as ${col}_max,
                                STD(${col}) as ${col}_std
                            `).join(',')}
                        FROM ${table}
                        ${conditions ? 'WHERE ' + conditions : ''}
                    `;
                    break;

                case 'distribution':
                    query = `
                        SELECT 
                            ${columns.join(', ')},
                            COUNT(*) as frequency
                        FROM ${table}
                        ${conditions ? 'WHERE ' + conditions : ''}
                        GROUP BY ${columns.join(', ')}
                        ${having ? 'HAVING ' + having : ''}
                        ORDER BY frequency DESC
                        ${limit ? 'LIMIT ' + limit : ''}
                    `;
                    break;

                case 'correlation':
                    if (columns.length !== 2) {
                        throw new Error('Correlation analysis requires exactly 2 columns');
                    }
                    query = `
                        SELECT 
                            (
                                COUNT(*) * SUM(${columns[0]} * ${columns[1]}) - SUM(${columns[0]}) * SUM(${columns[1]})
                            ) / (
                                SQRT(
                                    (COUNT(*) * SUM(${columns[0]} * ${columns[0]}) - SUM(${columns[0]}) * SUM(${columns[0]})) *
                                    (COUNT(*) * SUM(${columns[1]} * ${columns[1]}) - SUM(${columns[1]}) * SUM(${columns[1]}))
                                )
                            ) as correlation_coefficient
                        FROM ${table}
                        ${conditions ? 'WHERE ' + conditions : ''}
                    `;
                    break;

                case 'custom':
                    if (!analysisConfig.query) {
                        throw new Error('Custom analysis requires a query');
                    }
                    query = analysisConfig.query;
                    params = analysisConfig.params || [];
                    break;

                default:
                    throw new Error(`Unsupported analysis type: ${type}`);
            }
        }

        try {
            const results = await this.query(query, params);
            return {
                type: businessQuestion ? 'business_analysis' : type,
                results,
                metadata: {
                    businessQuestion,
                    table,
                    columns,
                    conditions,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            throw new Error(`Analysis failed: ${error.message}`);
        }
    }

    /**
     * Get database type
     */
    getDatabaseType() {
        return 'mysql';
    }
}