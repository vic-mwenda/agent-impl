import readline from 'readline';
import { memoryService } from './services/memory.service.js';
import { llmService } from './services/llm.service.js';
import { toolService } from './services/tool.service.js';
import { sessionService } from './services/session.service.js';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'You> '
});

// Special commands for session management
const COMMANDS = {
    '/new': 'Create a new session: /new [session name]',
    '/switch': 'Switch to a session: /switch [session id]',
    '/list': 'List all sessions',
    '/clear': 'Clear current session history',
    '/delete': 'Delete a session: /delete [session id]',
    '/help': 'Show this help message',
    '/exit': 'Exit the application'
};

function printHelp() {
    console.log('\nAvailable Commands:');
    Object.entries(COMMANDS).forEach(([cmd, desc]) => {
        console.log(`${cmd.padEnd(10)} - ${desc}`);
    });
    console.log();
}

async function handleCommand(input) {
    const [command, ...args] = input.trim().split(' ');
    
    switch (command) {
        case '/help':
            printHelp();
            return true;
            
        case '/new': {
            const name = args.join(' ') || undefined;
            const session = await sessionService.createSession(name);
            console.log(`Created new session: ${session.name} (${session.id})`);
            return true;
        }
        
        case '/switch': {
            const [sessionId] = args;
            if (!sessionId) {
                console.log('Error: Session ID required');
                return true;
            }
            try {
                const session = await sessionService.switchSession(sessionId);
                console.log(`Switched to session: ${session.name} (${session.id})`);
            } catch (error) {
                console.log(`Error: ${error.message}`);
            }
            return true;
        }
        
        case '/list': {
            const sessions = await sessionService.listSessions();
            console.log('\nAvailable Sessions:');
            sessions.forEach(session => {
                const active = session.isActive ? '(active)' : '';
                console.log(`- ${session.name} ${active}\n  ID: ${session.id}\n  Messages: ${session.messageCount}\n`);
            });
            return true;
        }
        
        case '/clear': {
            const session = await sessionService.getActiveSession();
            await sessionService.clearSession(session.id);
            console.log(`Cleared session: ${session.name}`);
            return true;
        }
        
        case '/delete': {
            const [sessionId] = args;
            if (!sessionId) {
                console.log('Error: Session ID required');
                return true;
            }
            try {
                await sessionService.deleteSession(sessionId);
                console.log(`Deleted session: ${sessionId}`);
            } catch (error) {
                console.log(`Error: ${error.message}`);
            }
            return true;
        }
        
        case '/exit':
            rl.close();
            return true;
    }
    
    return false;
}

async function processUserInput(input) {
    try {
        // Check for special commands
        if (input.startsWith('/')) {
            return await handleCommand(input);
        }

        const session = await sessionService.getActiveSession();
        const memoryContext = await memoryService.retrieve(input);
        
        // Add user message to session
        session.addMessage('user', input);
        
        const messages = [
            {
                role: 'system',
                content: `You are a helpful assistant with long-term memory and access to tools.
                         You can use tools by responding with a tool_calls array.
                         
                         Current session: ${session.name}
                         Relevant past chats:
                         ${memoryContext}`
            },
            ...session.getMessages()
        ];

        const tools = toolService.getToolsForLLM();
        const response = await llmService.chat(messages, tools);
        
        // Add assistant response to session
        session.addMessage('assistant', response);
        
        // Store the interaction in memory
        await memoryService.store(input, response);
        
        return false;
    } catch (err) {
        console.error('❌ Error:', err);
        return false;
    }
}

async function main() {
    try {
        // Initialize session service
        await sessionService.initialize();
        
        const activeSession = await sessionService.getActiveSession();
        console.log(`Active session: ${activeSession.name} (${activeSession.id})`);
        console.log('Type "/help" for available commands or "exit" to quit.');
        
        rl.prompt();

        rl.on('line', async (line) => {
            if (line.trim().toLowerCase() === 'exit') {
                rl.close();
                return;
            }

            const shouldExit = await processUserInput(line.trim());
            if (!shouldExit) {
                rl.prompt();
            }
        }).on('close', () => {
            console.log('\nGoodbye!');
            process.exit(0);
        });
    } catch (error) {
        console.error('Failed to initialize application:', error);
        process.exit(1);
    }
}

main();