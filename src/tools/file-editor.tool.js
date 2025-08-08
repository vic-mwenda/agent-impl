import { BaseTool } from './base.tool.js';
import fs from 'fs/promises';
import path from 'path';

export class FileEditorTool extends BaseTool {
    get name() {
        return 'edit_file';
    }

    get description() {
        return 'Edits a file by replacing text or adding new content';
    }

    get parameters() {
        return {
            type: 'object',
            properties: {
                file_path: {
                    type: 'string',
                    description: 'The path to the file to edit. Can be absolute or relative to the project root.'
                },
                operation: {
                    type: 'string',
                    enum: ['replace', 'append', 'prepend', 'insert_at_line'],
                    description: 'The type of edit operation to perform'
                },
                old_text: {
                    type: 'string',
                    description: 'For replace operation: The text to replace (must exist in the file)'
                },
                new_text: {
                    type: 'string',
                    description: 'The new text to insert or replace with'
                },
                line_number: {
                    type: 'number',
                    description: 'For insert_at_line operation: The line number where to insert the new text (1-based)'
                }
            },
            required: ['file_path', 'operation', 'new_text']
        };
    }

    async execute(params) {
        try {
            const filePath = path.resolve(process.cwd(), params.file_path);
            let content = await fs.readFile(filePath, 'utf-8');
            let updatedContent;
            
            switch (params.operation) {
                case 'replace':
                    if (!params.old_text) {
                        throw new Error('old_text is required for replace operation');
                    }
                    if (!content.includes(params.old_text)) {
                        throw new Error('old_text not found in file');
                    }
                    updatedContent = content.replace(params.old_text, params.new_text);
                    break;
                    
                case 'append':
                    updatedContent = content + '\n' + params.new_text;
                    break;
                    
                case 'prepend':
                    updatedContent = params.new_text + '\n' + content;
                    break;
                    
                case 'insert_at_line':
                    if (!params.line_number) {
                        throw new Error('line_number is required for insert_at_line operation');
                    }
                    const lines = content.split('\n');
                    if (params.line_number < 1 || params.line_number > lines.length + 1) {
                        throw new Error(`Invalid line number. File has ${lines.length} lines`);
                    }
                    lines.splice(params.line_number - 1, 0, params.new_text);
                    updatedContent = lines.join('\n');
                    break;
                    
                default:
                    throw new Error(`Unknown operation: ${params.operation}`);
            }
            
            await fs.writeFile(filePath, updatedContent, 'utf-8');
            
            return {
                success: true,
                operation: params.operation,
                file_path: params.file_path
            };
        } catch (error) {
            throw new Error(`Failed to edit file: ${error.message}`);
        }
    }
}
