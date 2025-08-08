import { toolRegistry } from '../tools/tool.registry.js';

class ToolService {
    constructor() {
        this.registry = toolRegistry;
    }

    getToolsForLLM() {
        return this.registry.getToolDescriptions().map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters
            }
        }));
    }

    async executeTool(toolName, params) {
        const tool = this.registry.getTool(toolName);
        return await tool.execute(params);
    }

    async parseAndExecuteToolCalls(toolCalls) {
        const results = [];
        
        for (const toolCall of toolCalls) {
            try {
                const { name, arguments: args } = toolCall;
                const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
                const result = await this.executeTool(name, parsedArgs);
                results.push({ toolCall, result });
            } catch (error) {
                results.push({ toolCall, error: error.message });
            }
        }
        
        return results;
    }
}

export const toolService = new ToolService();