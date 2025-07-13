import { BaseAgent, AgentContext, AgentTool } from "./BaseAgent.js";
import { runs } from "@running-coach/database";

export class RunLoggerAgent extends BaseAgent {
  name = "Run-Logger";
  role = "Workout Data Logger";
  personality = "Accurate, efficient, and detail-oriented.";

  constructor(tools: AgentTool) {
    super(tools);
  }

  protected getTask(context: AgentContext): string {
    return `Extract structured running workout data (distance, duration, perceived effort, date, notes) from the user's message. Store this data in the database and confirm to the user.`;
  }

  async run(context: AgentContext): Promise<string> {
    this.tools.logger.info(`[${this.name}] Running for user ${context.userId}. Message: "${context.userMessage}"`);
    try {
      const extractionPrompt = `
        System: You are a highly accurate data extraction AI. Your task is to extract running workout details from the user's message.
        Extract the following fields:
        - distance (number, in kilometers, e.g., 5.2, 10)
        - duration (number, in minutes, e.g., 30, 65)
        - perceivedEffort (number, 1-10, e.g., 7, 5)
        - date (YYYY-MM-DD, default to today if not specified)
        - notes (string, any additional comments)

        If a field is not explicitly mentioned, infer it if possible or leave it null.
        Respond ONLY with a JSON object containing these fields. Do NOT include any other text.

        User's message: ${context.userMessage}
      `;

      const extractedDataJson = await this.tools.llmClient.generateResponse(extractionPrompt, undefined, "none") as string;
      this.tools.logger.info(`[${this.name}] Extracted data: ${extractedDataJson}`);

      let extractedData: any;
      try {
        extractedData = JSON.parse(extractedDataJson as string);
      } catch (parseError) {
        this.tools.logger.error(`[${this.name}] Failed to parse extracted data JSON:`, parseError);
        return this.tools.i18nService.t('run_logger:parse_error', context.userProfile?.preferredLanguage);
      }

      // Validate and sanitize extracted data
      const distance = parseFloat(extractedData.distance);
      const duration = parseInt(extractedData.duration);
      const perceivedEffort = parseInt(extractedData.perceivedEffort);
      const runDate = extractedData.date ? new Date(extractedData.date) : new Date();
      const notes = extractedData.notes || null;

      if (isNaN(distance) || isNaN(duration) || isNaN(perceivedEffort) || !runDate) {
        return this.tools.i18nService.t('run_logger:missing_data_error', context.userProfile?.preferredLanguage);
      }

      // Store in database
      await this.tools.database.query.insert(runs).values({
        userId: context.userId,
        distance: distance.toString(),
        duration: duration,
        perceivedEffort: perceivedEffort,
        date: runDate,
        notes,
      });
      this.tools.logger.info(`[${this.name}] Stored run data in database for user ${context.userId}.`);

      // Store in vector memory
      const runSummary = `User ran ${distance} km in ${duration} minutes with a perceived effort of ${perceivedEffort}/10 on ${runDate.toDateString()}. Notes: ${notes || 'None'}`;
      await this.tools.vectorMemory.storeMemory({
        id: this.tools.vectorMemory.generateId(),
        userId: context.userId,
        content: runSummary,
        type: 'run_data',
        timestamp: new Date(),
        metadata: { distance, duration, perceivedEffort, date: runDate.toISOString(), notes },
      });
      this.tools.logger.info(`[${this.name}] Stored run summary in vector memory for user ${context.userId}.`);

      return this.tools.i18nService.t('run_logger:success_confirmation', context.userProfile?.preferredLanguage);

    } catch (error) {
      this.tools.logger.error(`[${this.name}] Error processing run log for user ${context.userId}:`, error);
      return this.tools.i18nService.t('run_logger:generic_error', context.userProfile?.preferredLanguage);
    }
  }
}
