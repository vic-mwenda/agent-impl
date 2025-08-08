import Groq from 'groq-sdk';
import { config } from '../config/index.js';
import { toolService } from './tool.service.js';

class LLMService {
    constructor() {
        this.groq = new Groq({ apiKey: config.groq.apiKey });
    }

    async chat(messages, tools = null) {
        const stream = await this.groq.chat.completions.create({
            model: config.groq.model,
            messages,
            stream: true,
            ...(tools && { tools, tool_choice: 'auto' })
        });

        let fullReply = '';
        let currentToolCalls = [];
        process.stdout.write('Groq: ');
        
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            const toolCalls = chunk.choices[0]?.delta?.tool_calls || [];
            
            if (content) {
                process.stdout.write(content);
                fullReply += content;
            }
            
            for (const toolCall of toolCalls) {
                const existingCall = currentToolCalls.find(tc => tc.id === toolCall.id);
                if (existingCall) {
                    if (toolCall.function?.name) existingCall.function.name = toolCall.function.name;
                    if (toolCall.function?.arguments) {
                        existingCall.function.arguments = (existingCall.function.arguments || '') + toolCall.function.arguments;
                    }
                } else if (toolCall.id) {
                    currentToolCalls.push({
                        id: toolCall.id,
                        type: 'function',
                        function: {
                            name: toolCall.function?.name || '',
                            arguments: toolCall.function?.arguments || ''
                        }
                    });
                }
            }
        }
        console.log('\n');

        if (currentToolCalls.length > 0) {
            console.log('\nExecuting tool calls...');
            const toolResults = await Promise.all(
                currentToolCalls.map(async toolCall => {
                    try {
                        const result = await toolService.executeTool(
                            toolCall.function.name,
                            JSON.parse(toolCall.function.arguments)
                        );
                        return {
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: JSON.stringify(result)
                        };
                    } catch (error) {
                        return {
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: `Error: ${error.message}`
                        };
                    }
                })
            );

            const finalResponse = await this.groq.chat.completions.create({
                model: config.groq.model,
                messages: [
                    ...messages,
                    {
                        role: 'assistant',
                        content: fullReply,
                        tool_calls: currentToolCalls
                    },
                    ...toolResults
                ],
                stream: false
            });

            const finalContent = finalResponse.choices[0]?.message?.content || '';
            if (finalContent) {
                console.log('Groq: ' + finalContent);
                fullReply += '\n' + finalContent;
            }
        }
        
        return fullReply;
    }
}

export const llmService = new LLMService();