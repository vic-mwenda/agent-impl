import { CalculatorTool } from './calculator.tool.js';
import { FileReaderTool } from './file-reader.tool.js';
import { FileEditorTool } from './file-editor.tool.js';
import { SessionManagerTool } from './session-manager.tool.js';

class ToolRegistry {
    constructor() {
        this.tools = new Map();
        this.registerDefaultTools();
    }

    registerDefaultTools() {
        this.registerTool(new CalculatorTool());
        this.registerTool(new FileReaderTool());
        this.registerTool(new FileEditorTool());
        this.registerTool(new SessionManagerTool());
    }

    registerTool(tool) {
        this.tools.set(tool.name, tool);
    }

    getTool(name) {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Tool '${name}' not found`);
        }
        return tool;
    }

    getToolDescriptions() {
        return Array.from(this.tools.values()).map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        }));
    }
}

export const toolRegistry = new ToolRegistry();