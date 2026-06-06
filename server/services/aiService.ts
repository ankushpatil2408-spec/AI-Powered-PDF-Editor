import { GoogleGenAI } from "@google/genai";

export class AiService {
  private aiClient: GoogleGenAI | null = null;

  private getClient(): GoogleGenAI {
    if (this.aiClient) {
      return this.aiClient;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    // Check if key is configured, if it has a placeholder, or is missing
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please add your key in the Secrets/Settings panel.");
    }

    this.aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    return this.aiClient;
  }

  /**
   * Refines, polishes, translates, or reformats the given text using Gemini
   */
  public async polishText(text: string, styleInstruction: string): Promise<string> {
    try {
      const client = this.getClient();
      
      const prompt = `You are a professional PDF document copy editor. 
Please refine or change the following target text following this custom style instruction: "${styleInstruction}".

CRITICAL RULE: Return ONLY the raw edited text. Do NOT wrap it in quotes, do NOT add explanations, do NOT add markdown codes (like \`\`\`), and do NOT change the context unless requested. Maintain any critical capitalization, spaces list items, or linebreaks where possible to not break text bounds.

Target Text:
"""
${text}
"""`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      if (!response.text) {
        throw new Error("Gemini returned an empty reply.");
      }

      return response.text.trim();
    } catch (err: any) {
      console.error("AI polishing service error:", err);
      // Fallback behavior if key is missing or service fails, avoiding blockages
      if (err.message?.includes("GEMINI_API_KEY")) {
        throw new Error("Gemini API access is unavailable: " + err.message);
      }
      throw new Error("Failed to process text with Gemini: " + err.message);
    }
  }
}

export const aiService = new AiService();
