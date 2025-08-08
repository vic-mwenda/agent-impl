import { BaseTool } from './base.tool.js';
import fs from 'fs/promises';
import path from 'path';

export class FileReaderTool extends BaseTool {
    get name() {
        return 'read_file';
    }

    get description() {
        return 'Reads the contents of a file from the filesystem';
    }

    get parameters() {
        return {
            type: 'object',
            properties: {
                file_path: {
                    type: 'string',
                    description: 'The path to the file to read. Can be absolute or relative to the project root.'
                },
                start_line: {
                    type: 'number',
                    description: 'Optional: Start reading from this line number (1-based)'
                },
                end_line: {
                    type: 'number',
                    description: 'Optional: Stop reading at this line number (1-based)'
                }
            },
            required: ['file_path']
        };
    }

    async execute(params) {
        try {
            const filePath = path.resolve(process.cwd(), params.file_path);
            const content = await fs.readFile(filePath, 'utf-8');
            
            if (params.start_line || params.end_line) {
                const lines = content.split('\n');
                const start = params.start_line ? params.start_line - 1 : 0;
                const end = params.end_line || lines.length;
                return {
                    content: lines.slice(start, end).join('\n'),
                    total_lines: lines.length,
                    read_lines: {
                        start: start + 1,
                        end: Math.min(end, lines.length)
                    }
                };
            }

            return {
                content,
                total_lines: content.split('\n').length
            };
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`File not found: ${params.file_path}`);
            }
            throw new Error(`Failed to read file: ${error.message}`);
        }
    }
}
