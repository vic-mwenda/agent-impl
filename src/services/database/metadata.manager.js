/**
 * Manages database metadata including table relationships, business concepts,
 * and semantic mappings for intelligent query analysis.
 */
export class DatabaseMetadataManager {
    constructor() {
        this.metadata = {
            tables: new Map(),
            relationships: new Map(),
            businessConcepts: new Map(),
            metrics: new Map()
        };
    }

    /**
     * Register table metadata with business context
     * @param {Object} tableMetadata Table metadata configuration
     */
    registerTable(tableMetadata) {
        const {
            tableName,
            businessName,
            description,
            columns,
            primaryKey,
            timestamps = true
        } = tableMetadata;

        this.metadata.tables.set(tableName, {
            businessName,
            description,
            columns: new Map(columns.map(col => [col.name, {
                ...col,
                businessName: col.businessName || col.name,
                description: col.description || '',
                dataType: col.dataType,
                isMetric: col.isMetric || false,
                aggregations: col.aggregations || [],
                businessRules: col.businessRules || []
            }])),
            primaryKey,
            timestamps
        });
    }

    /**
     * Register relationship between tables
     * @param {Object} relationship Relationship configuration
     */
    registerRelationship(relationship) {
        const {
            name,
            sourceTable,
            targetTable,
            type, // ONE_TO_ONE, ONE_TO_MANY, MANY_TO_MANY
            sourceKey,
            targetKey,
            joinTable, // for MANY_TO_MANY
            businessDescription
        } = relationship;

        this.metadata.relationships.set(name, {
            sourceTable,
            targetTable,
            type,
            sourceKey,
            targetKey,
            joinTable,
            businessDescription
        });
    }

    /**
     * Register business concept that maps to one or more database entities
     * @param {Object} concept Business concept configuration
     */
    registerBusinessConcept(concept) {
        const {
            name,
            description,
            tables,
            metrics,
            commonQueries
        } = concept;

        this.metadata.businessConcepts.set(name, {
            description,
            tables: tables.map(table => ({
                tableName: table.name,
                role: table.role,
                conditions: table.conditions || []
            })),
            metrics: metrics.map(metric => ({
                name: metric.name,
                description: metric.description,
                calculation: metric.calculation,
                table: metric.table,
                column: metric.column,
                aggregation: metric.aggregation,
                filters: metric.filters || []
            })),
            commonQueries: commonQueries || []
        });
    }

    /**
     * Register business metric with calculation rules
     * @param {Object} metric Metric configuration
     */
    registerMetric(metric) {
        const {
            name,
            description,
            type, // SIMPLE, CALCULATED, DERIVED
            calculation,
            dependencies,
            validations
        } = metric;

        this.metadata.metrics.set(name, {
            description,
            type,
            calculation,
            dependencies: dependencies || [],
            validations: validations || []
        });
    }

    /**
     * Get join path between tables
     * @param {string} sourceTable Starting table
     * @param {string} targetTable Target table
     * @returns {Array} Array of joins needed
     */
    getJoinPath(sourceTable, targetTable) {
        // Simple BFS to find shortest join path
        const visited = new Set();
        const queue = [[sourceTable, []]];
        
        while (queue.length > 0) {
            const [currentTable, path] = queue.shift();
            
            if (currentTable === targetTable) {
                return path;
            }

            for (const [, rel] of this.metadata.relationships) {
                if (rel.sourceTable === currentTable && !visited.has(rel.targetTable)) {
                    visited.add(rel.targetTable);
                    queue.push([rel.targetTable, [...path, rel]]);
                }
                if (rel.targetTable === currentTable && !visited.has(rel.sourceTable)) {
                    visited.add(rel.sourceTable);
                    queue.push([rel.sourceTable, [...path, rel]]);
                }
            }
        }

        return null; // No path found
    }

    /**
     * Analyze business question and generate query plan
     * @param {string} question Business question
     * @returns {Object} Query plan with tables, joins, and metrics needed
     */
    analyzeBusinessQuestion(question) {
        const concepts = this.findRelevantConcepts(question);
        const metrics = this.findRelevantMetrics(question);
        
        const queryPlan = {
            concepts,
            metrics,
            tables: new Set(),
            joins: [],
            aggregations: [],
            filters: []
        };

        // Gather required tables from concepts
        concepts.forEach(concept => {
            const conceptData = this.metadata.businessConcepts.get(concept);
            conceptData.tables.forEach(table => {
                queryPlan.tables.add(table.tableName);
                if (table.conditions) {
                    queryPlan.filters.push(...table.conditions);
                }
            });
        });

        // Add tables needed for metrics
        metrics.forEach(metric => {
            const metricData = this.metadata.metrics.get(metric);
            if (metricData.dependencies) {
                metricData.dependencies.forEach(dep => {
                    queryPlan.tables.add(dep.table);
                });
            }
        });

        // Find necessary joins
        const tables = Array.from(queryPlan.tables);
        for (let i = 0; i < tables.length - 1; i++) {
            const joinPath = this.getJoinPath(tables[i], tables[i + 1]);
            if (joinPath) {
                queryPlan.joins.push(...joinPath);
            }
        }

        return queryPlan;
    }

    /**
     * Find relevant business concepts in a question
     * @param {string} question Business question
     * @returns {Array} Relevant concept names
     */
    findRelevantConcepts(question) {
        const concepts = [];
        for (const [conceptName, concept] of this.metadata.businessConcepts) {
            // Simple keyword matching - could be enhanced with NLP
            if (question.toLowerCase().includes(conceptName.toLowerCase()) ||
                concept.commonQueries.some(q => 
                    question.toLowerCase().includes(q.toLowerCase()))) {
                concepts.push(conceptName);
            }
        }
        return concepts;
    }

    /**
     * Find relevant metrics in a question
     * @param {string} question Business question
     * @returns {Array} Relevant metric names
     */
    findRelevantMetrics(question) {
        const metrics = [];
        for (const [metricName, metric] of this.metadata.metrics) {
            if (question.toLowerCase().includes(metricName.toLowerCase())) {
                metrics.push(metricName);
            }
        }
        return metrics;
    }
}

