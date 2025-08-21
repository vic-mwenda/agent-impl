/**
 * Abstract base class for database connectors.
 * This class defines the interface that all database connectors must implement.
 */
export class BaseConnector {
    constructor(config) {
        if (this.constructor === BaseConnector) {
            throw new Error('BaseConnector is an abstract class and cannot be instantiated directly');
        }
        this.config = config;
        this.connection = null;
    }

    /**
     * Initialize the database connection
     * @returns {Promise<void>}
     */
    async connect() {
        throw new Error('Method connect() must be implemented by derived class');
    }

    /**
     * Close the database connection
     * @returns {Promise<void>}
     */
    async disconnect() {
        throw new Error('Method disconnect() must be implemented by derived class');
    }

    /**
     * Execute a raw SQL query
     * @param {string} query - The SQL query to execute
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>} Query results
     */
    async query(query, params = []) {
        throw new Error('Method query() must be implemented by derived class');
    }

    /**
     * Get table schema information
     * @param {string} tableName - Name of the table
     * @returns {Promise<Object>} Table schema information
     */
    async getTableSchema(tableName) {
        throw new Error('Method getTableSchema() must be implemented by derived class');
    }

    /**
     * List all tables in the database
     * @returns {Promise<Array<string>>} Array of table names
     */
    async listTables() {
        throw new Error('Method listTables() must be implemented by derived class');
    }

    /**
     * Perform data analysis query
     * @param {Object} analysisConfig - Configuration for the analysis
     * @returns {Promise<Object>} Analysis results
     */
    async analyze(analysisConfig) {
        throw new Error('Method analyze() must be implemented by derived class');
    }

    /**
     * Check if connection is active
     * @returns {boolean}
     */
    isConnected() {
        return this.connection !== null;
    }

    /**
     * Get database type
     * @returns {string}
     */
    getDatabaseType() {
        throw new Error('Method getDatabaseType() must be implemented by derived class');
    }
}