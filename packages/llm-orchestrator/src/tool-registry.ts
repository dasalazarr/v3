import { z } from 'zod';
import { ToolCall } from '@running-coach/shared';

export interface ToolFunction {
  name: string;
  description: string;
  parameters: z.ZodSchema;
  execute: (params: any) => Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, ToolFunction> = new Map();

  /**
   * Register a tool function
   */
  public register(tool: ToolFunction): void {
    this.tools.set(tool.name, tool);
    console.log(`🔧 Registered tool: ${tool.name}`);
  }

  /**
   * Execute a tool call
   */
  public async execute(toolCall: ToolCall): Promise<any> {
    const tool = this.tools.get(toolCall.name);
    if (!tool) {
      throw new Error(`Tool '${toolCall.name}' not found`);
    }

    try {
      console.log(`🔧 [TOOL_REGISTRY] Executing tool: ${toolCall.name}`);
      console.log(`🔧 [TOOL_REGISTRY] Raw parameters:`, toolCall.parameters);

      // Extract userId before validation (it's not in schema)
      const userId = toolCall.parameters.userId;

      // Validate parameters (excluding userId)
      const { userId: _, ...paramsForValidation } = toolCall.parameters;
      const validatedParams = tool.parameters.parse(paramsForValidation);

      // Add userId back after validation
      const finalParams = { ...validatedParams, userId };

      console.log(`🔧 [TOOL_REGISTRY] Final parameters with userId:`, finalParams);

      // Execute tool
      const result = await tool.execute(finalParams);

      console.log(`✅ Executed tool: ${toolCall.name}`);
      return result;
    } catch (error) {
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

  /**
   * Get available tools for OpenAI function calling
   */
  public getOpenAITools(): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: any;
    };
  }> {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: this.zodToJsonSchema(tool.parameters),
      },
    }));
  }

  /**
   * Get list of available tool names
   */
  public getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if a tool exists
   */
  public hasTools(name: string): boolean {
    return this.tools.has(name);
  }

  private zodToJsonSchema(schema: z.ZodSchema): any {
    // Simplified Zod to JSON Schema conversion
    // In production, use a proper library like zod-to-json-schema
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      const properties: any = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = this.zodTypeToJsonSchema(value as z.ZodTypeAny);
        if (!(value as z.ZodTypeAny).isOptional()) {
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

  private zodTypeToJsonSchema(type: z.ZodTypeAny): any {
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

    return { type: 'string' }; // Fallback
  }
}