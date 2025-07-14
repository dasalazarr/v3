import { z } from 'zod';
import { ToolCall } from '@running-coach/shared';
export interface ToolFunction {
    name: string;
    description: string;
    parameters: z.ZodSchema;
    execute: (params: any) => Promise<any>;
}
export declare class ToolRegistry {
    private tools;
    register(tool: ToolFunction): void;
    execute(toolCall: ToolCall): Promise<any>;
    getOpenAITools(): Array<{
        type: 'function';
        function: {
            name: string;
            description: string;
            parameters: any;
        };
    }>;
    getAvailableTools(): string[];
    hasTools(name: string): boolean;
    private zodToJsonSchema;
    private zodTypeToJsonSchema;
}
//# sourceMappingURL=tool-registry.d.ts.map