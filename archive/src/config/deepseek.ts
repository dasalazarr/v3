import { config } from './index';

interface Message {
  role: string;
  content: string;
}

export class DeepSeek {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = config.baseURL || 'https://api.deepseek.com/v1';
    this.apiKey = config.apiKey;
  }

  async chat(messages: Message[]): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: config.Model || 'deepseek-chat',
          messages,
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error en DeepSeek chat:', error);
      throw error;
    }
  }
}
