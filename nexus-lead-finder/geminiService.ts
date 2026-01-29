import { GoogleGenAI, Type } from "@google/genai";
import { AppMode, SearchResult, ChatMessage } from "./types";

/**
 * Enhanced JSON extraction that handles truncated or improperly closed JSON strings.
 */
function extractJson(text: string): any {
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;

  if (start === -1) {
    throw new Error("No JSON structure found in response");
  }

  let jsonCandidate = text.substring(start).trim();
  jsonCandidate = jsonCandidate.replace(/[^\}\]]+$/, "");

  try {
    return JSON.parse(jsonCandidate);
  } catch (e) {
    let fixed = jsonCandidate;
    const quoteCount = (fixed.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) fixed += '"';

    const stack: string[] = [];
    for (let i = 0; i < fixed.length; i++) {
      if (fixed[i] === '{' || fixed[i] === '[') stack.push(fixed[i]);
      else if (fixed[i] === '}') { if (stack[stack.length - 1] === '{') stack.pop(); }
      else if (fixed[i] === ']') { if (stack[stack.length - 1] === '[') stack.pop(); }
    }
    while (stack.length > 0) {
      const last = stack.pop();
      if (last === '{') fixed += '}';
      if (last === '[') fixed += ']';
    }
    try {
      return JSON.parse(fixed);
    } catch (innerError) {
      throw innerError;
    }
  }
}

export async function processChat(query: string, history: ChatMessage[] = []): Promise<SearchResult> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-2.5-flash";

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      mode: { type: Type.STRING },
      summary: { type: Type.STRING },
      paragraphs: { type: Type.ARRAY, items: { type: Type.STRING } },
      leads: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            industry: { type: Type.STRING },
            location: { type: Type.STRING },
            website: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            socials: {
              type: Type.OBJECT,
              properties: {
                linkedin: { type: Type.STRING },
                instagram: { type: Type.STRING },
                facebook: { type: Type.STRING },
                twitter: { type: Type.STRING },
              }
            },
            keyPeople: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  email: { type: Type.STRING },
                  linkedin: { type: Type.STRING },
                  phone: { type: Type.STRING },
                }
              }
            },
            growthSignals: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  activity: { type: Type.STRING },
                  date: { type: Type.STRING },
                }
              }
            },
            matchScore: { type: Type.NUMBER },
            marketHeat: { type: Type.NUMBER },
            type: { type: Type.STRING, description: "person or company" },
            detailedBriefing: {
              type: Type.OBJECT,
              properties: {
                overview: { type: Type.STRING },
                background: { type: Type.STRING },
                context: { type: Type.STRING },
              },
              required: ["overview", "background", "context"]
            }
          },
          required: ["name", "description", "matchScore", "marketHeat", "type", "detailedBriefing", "industry", "location"],
        },
      },
      explanation: { type: Type.STRING },
      outOfContextMessage: { type: Type.STRING },
      followUps: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ["mode"],
  };

  const systemInstruction = `
    You are a professional research assistant providing high-quality business leads. 
    Use clear, natural human language. 

    STRICT RULES ON OUTPUT:
    - NEVER use AI jargon, intelligence buzzwords, or technical system language.
    - NEVER output raw markdown symbols like **asterisks** or double quotes in the summary text.
    - Use natural text formatting.
    - In TEXT mode, if comparing data, render clean Markdown tables.

    LEAD QUANTITY RULE:
    - In LEAD mode, return AT LEAST 7 leads. Target 7–12.
    - Use as many tokens as needed for rich, accurate data. Never truncate.

    CONTINUITY:
    - Respect the chat history. Maintain context for follow-up refinements.

    SCORING LOGIC (1-100):
    - Match Strength: Intent and industry alignment.
    - Market Traction: Momentum and growth signals.

    OUTPUT MUST BE STRICTLY VALID JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { 
          role: 'user', 
          parts: [{ text: `System Context: ${systemInstruction}\n\nSearch Context: ${JSON.stringify(history)}\n\nCurrent Request: ${query}` }] 
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1,
        maxOutputTokens: 3000,
        thinkingConfig: { thinkingBudget: 400 }
      },
    });

    const parsed = extractJson(response.text || "{}");
    parsed.mode = parsed.mode?.toUpperCase() || (parsed.leads?.length ? 'LEAD' : 'TEXT');
    return { ...parsed, query };
  } catch (error: any) {
    console.error("Data Fetch Error:", error);
    throw error;
  }
}