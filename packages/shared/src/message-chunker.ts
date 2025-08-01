/**
 * Message Chunker - Splits long messages into smaller chunks for WhatsApp
 * Prevents message truncation due to token/character limits
 */

export interface ChunkOptions {
  maxLength: number;
  preserveFormatting: boolean;
  chunkIndicator: boolean;
}

export class MessageChunker {
  private static readonly DEFAULT_MAX_LENGTH = 1500; // WhatsApp safe limit
  private static readonly CHUNK_SEPARATOR = '\n\n---\n\n';
  
  /**
   * Split a long message into smaller chunks
   */
  static chunkMessage(
    message: string, 
    options: Partial<ChunkOptions> = {}
  ): string[] {
    const config = {
      maxLength: options.maxLength || this.DEFAULT_MAX_LENGTH,
      preserveFormatting: options.preserveFormatting ?? true,
      chunkIndicator: options.chunkIndicator ?? true
    };

    // If message is short enough, return as-is
    if (message.length <= config.maxLength) {
      return [message];
    }

    const chunks: string[] = [];
    let currentChunk = '';
    
    // Split by paragraphs first to preserve formatting
    const paragraphs = message.split('\n\n');
    
    for (const paragraph of paragraphs) {
      // If single paragraph is too long, split by sentences
      if (paragraph.length > config.maxLength) {
        const sentences = this.splitBySentences(paragraph);
        
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 2 > config.maxLength) {
            if (currentChunk.trim()) {
              chunks.push(currentChunk.trim());
              currentChunk = '';
            }
          }
          currentChunk += sentence + ' ';
        }
      } else {
        // Check if adding this paragraph would exceed limit
        if (currentChunk.length + paragraph.length + 2 > config.maxLength) {
          if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
            currentChunk = '';
          }
        }
        currentChunk += paragraph + '\n\n';
      }
    }
    
    // Add remaining content
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // Add chunk indicators if requested
    if (config.chunkIndicator && chunks.length > 1) {
      return chunks.map((chunk, index) => {
        const indicator = `(${index + 1}/${chunks.length})`;
        return `${chunk}\n\n${indicator}`;
      });
    }

    return chunks;
  }

  /**
   * Split text by sentences while preserving formatting
   */
  private static splitBySentences(text: string): string[] {
    // Split by sentence endings but preserve formatting markers
    const sentences = text.split(/(?<=[.!?])\s+/);
    return sentences.filter(s => s.trim().length > 0);
  }

  /**
   * Smart chunking for training plans (preserves structure)
   */
  static chunkTrainingPlan(planText: string): string[] {
    const maxLength = 1400; // Slightly smaller for training plans
    
    // Split by weeks/sections
    const sections = planText.split(/(?=### \*🔹 Semana \d+\*)|(?=## \*)/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const section of sections) {
      if (!section.trim()) continue;

      if (currentChunk.length + section.length > maxLength) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
      }
      currentChunk += section;
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // Add continuation indicators for training plans
    return chunks.map((chunk, index) => {
      if (chunks.length > 1) {
        if (index === 0) {
          return `${chunk}\n\n📋 *Continúa...*`;
        } else if (index === chunks.length - 1) {
          return `📋 *Continuación:*\n\n${chunk}`;
        } else {
          return `📋 *Continuación (${index + 1}/${chunks.length}):*\n\n${chunk}\n\n📋 *Continúa...*`;
        }
      }
      return chunk;
    });
  }

  /**
   * Chunk advice/tips messages
   */
  static chunkAdvice(adviceText: string): string[] {
    const maxLength = 1300;
    
    // Split by numbered sections or bullet points
    const sections = adviceText.split(/(?=### \d+\.)|(?=\n\d+\.)/);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const section of sections) {
      if (!section.trim()) continue;

      if (currentChunk.length + section.length > maxLength) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
      }
      currentChunk += section;
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // Add continuation indicators
    return chunks.map((chunk, index) => {
      if (chunks.length > 1) {
        if (index === 0) {
          return `${chunk}\n\n💡 *Más consejos en el siguiente mensaje...*`;
        } else if (index === chunks.length - 1) {
          return `💡 *Continuación de consejos:*\n\n${chunk}`;
        } else {
          return `💡 *Continuación (${index + 1}/${chunks.length}):*\n\n${chunk}\n\n💡 *Continúa...*`;
        }
      }
      return chunk;
    });
  }

  /**
   * Estimate if a message needs chunking
   */
  static needsChunking(message: string, maxLength: number = 1500): boolean {
    return message.length > maxLength;
  }

  /**
   * Get safe message length for WhatsApp
   */
  static getSafeLength(): number {
    return this.DEFAULT_MAX_LENGTH;
  }
}
