import { z } from 'zod';
export class ToolRegistry {
    tools = new Map();
    register(tool) {
        this.tools.set(tool.name, tool);
        console.log(`🔧 Registered tool: ${tool.name}`);
    }
    async execute(toolCall) {
        const tool = this.tools.get(toolCall.name);
        if (!tool) {
            throw new Error(`Tool '${toolCall.name}' not found`);
        }
        try {
            const validatedParams = tool.parameters.parse(toolCall.parameters);
            const result = await tool.execute(validatedParams);
            console.log(`✅ Executed tool: ${toolCall.name}`);
            return result;
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                console.warn(`⚠️ Validation failed for tool ${toolCall.name}:`, error.issues);
                const missingFields = error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                }));
                return {
                    error: 'VALIDATION_FAILED',
                    message: `I need more information to log your run. Please provide the following: ${missingFields.map(f => f.field).join(', ')}`,
                    details: missingFields,
                };
            }
            console.error(`❌ Error executing tool ${toolCall.name}:`, error);
            throw error;
        }
    }
    getOpenAITools() {
        return Array.from(this.tools.values()).map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: this.zodToJsonSchema(tool.parameters),
            },
        }));
    }
    getAvailableTools() {
        return Array.from(this.tools.keys());
    }
    hasTools(name) {
        return this.tools.has(name);
    }
    zodToJsonSchema(schema) {
        if (schema instanceof z.ZodObject) {
            const shape = schema.shape;
            const properties = {};
            const required = [];
            for (const [key, value] of Object.entries(shape)) {
                properties[key] = this.zodTypeToJsonSchema(value);
                if (!value.isOptional()) {
                    required.push(key);
                }
            }
            return {
                type: 'object',
                properties,
                required,
            };
        }
        return this.zodTypeToJsonSchema(schema);
    }
    zodTypeToJsonSchema(type) {
        if (type instanceof z.ZodString) {
            return { type: 'string' };
        }
        if (type instanceof z.ZodNumber) {
            return { type: 'number' };
        }
        if (type instanceof z.ZodBoolean) {
            return { type: 'boolean' };
        }
        if (type instanceof z.ZodEnum) {
            return { type: 'string', enum: type.options };
        }
        if (type instanceof z.ZodArray) {
            return {
                type: 'array',
                items: this.zodTypeToJsonSchema(type.element),
            };
        }
        if (type instanceof z.ZodOptional) {
            return this.zodTypeToJsonSchema(type.unwrap());
        }
        return { type: 'string' };
    }
}
//# sourceMappingURL=tool-registry.js.map