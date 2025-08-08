export class BaseTool {
    constructor() {
        if (this.constructor === BaseTool) {
            throw new Error('BaseTool is abstract and cannot be instantiated directly');
        }
    }

    get name() {
        throw new Error('Tool must implement name getter');
    }

    get description() {
        throw new Error('Tool must implement description getter');
    }

    get parameters() {
        throw new Error('Tool must implement parameters getter');
    }

    async execute(params) {
        throw new Error('Tool must implement execute method');
    }

    validateParams(params) {
        const requiredParams = this.parameters.required || [];
        const missingParams = requiredParams.filter(param => !(param in params));
        
        if (missingParams.length > 0) {
            throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
        }
    }
}
