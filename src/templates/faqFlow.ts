import { addKeyword, EVENTS } from "@builderbot/bot";
import aiServices from "~/services/aiservices";
import { config } from "../config";
import path from "path";
import fs, { stat } from "fs";
import sheetsServices from "~/services/sheetsServices";

const pathPrompt = path.join(
  process.cwd(),
  "assets/prompts",
  "prompt_OpenAI.txt"
);

const prompt = fs.readFileSync(pathPrompt, "utf8");

export const faqFlow = addKeyword(EVENTS.ACTION)
  .addAction(
    async (ctx,{state, endFlow, gotoFlow}) => {
      const history = await sheetsServices.getUserConv(ctx.from);
      history.push({ role: "user", content: ctx.body });

      try {
        const AI = new aiServices(config.apiKey);
        const response = await AI.chat(prompt, history);
        await sheetsServices.addConverToUser(
          ctx.from,
          [{ role: "user", content: ctx.body }, { role: "assistant", content: response }]
        );
        return endFlow(response);
      } catch (error) {
        console.log("Error en la llamada GPT:", error);
        return endFlow("Por favor, intenta de nuevo");
      }
    }
  );
