import { BaseTool } from './base.tool.js';

export class CalculatorTool extends BaseTool {
    get name() {
        return 'calculator';
    }

    get description() {
        return 'Performs basic arithmetic calculations';
    }

    get parameters() {
        return {
            type: 'object',
            properties: {
                expression: {
                    type: 'string',
                    description: 'The mathematical expression to evaluate'
                }
            },
            required: ['expression']
        };
    }

    async execute(params) {
        this.validateParams(params);
        
        try {
            // Using Function constructor for a sandboxed evaluation
            // Only allows basic arithmetic operations
            const sanitizedExpression = params.expression.replace(/[^0-9+\-*/.()\s]/g, '');
            const result = new Function(`return ${sanitizedExpression}`)();
            return { result };
        } catch (error) {
            throw new Error(`Failed to evaluate expression: ${error.message}`);
        }
    }
}
