
import { GoogleGenAI, Type } from "@google/genai";
import { GoalLevel } from "../types";

// Always use a named parameter and obtain the API key exclusively from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getTaskBreakdown = async (goalTitle: string, goalDescription: string): Promise<{text: string, level: GoalLevel, tip: string}[]> => {
  // Use ai.models.generateContent directly with model name and prompt
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Let's make this simple and doable. Please break down this 2026 goal into 5-8 small, realistic steps. 
    Use everyday language that feels warm and supportive, like a friend helping a friend. 
    Avoid any fancy or difficult words.
    
    For each step:
    1. Pick a level: "Easy", "Medium", or "Hard".
    2. Share a quick, friendly tip (max 12 words) on how to get started comfortably.
    
    Goal: ${goalTitle}
    Context: ${goalDescription}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: 'Simple, actionable step' },
            level: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"], description: 'How it feels to do this' },
            tip: { type: Type.STRING, description: 'A friendly word of advice' }
          },
          required: ['text', 'level', 'tip']
        }
      }
    }
  });

  try {
    const jsonStr = response.text || '[]';
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    console.error("Failed to parse task breakdown", e);
    return [];
  }
};

export const getSingleTaskTip = async (taskText: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Give me a very short, warm, and friendly tip for this task: "${taskText}". Use simple words and sound like a supportive coach. Max 10 words.`,
  });
  return (response.text || '').trim().replace(/^"|"$/g, '');
};

export const getGoalAdvice = async (goalTitle: string, goalDescription: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Let's make this simple and doable. Act as a supportive coach. Give 3 practical, easy-to-understand ways to help make this goal happen:
    Title: "${goalTitle}"
    Context: "${goalDescription}"
    Use simple words, be very encouraging, and keep it human. No professional jargon.`,
  });
  return response.text || '';
};

export const suggestDescription = async (goalTitle: string, currentText?: string): Promise<string> => {
  const prompt = currentText?.trim() 
    ? `Let's make this simple and doable. I have these thoughts for the goal "${goalTitle}": "${currentText}". 
       Please enhance the grammar and structure to make it very easy to read and follow. 
       Do NOT change the original thoughts or ideas. Simply reorganize them into 1-2 clear, actionable sentences that make execution easy. 
       Keep the tone warm, human, and supportive.`
    : `Let's make this simple and doable. The goal is "${goalTitle}". 
       Write a very simple, friendly description (1-2 sentences) of how to start this. 
       Focus on small, actionable steps and keep it very human.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });
  return (response.text || '').trim();
};

export const getDailyQuote = async (): Promise<{ text: string; author: string }> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: "Give me one simple, warm, and motivating quote about taking small steps and being kind to yourself while working toward a goal. It should feel like a gentle hug. Use everyday language.",
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          author: { type: Type.STRING }
        },
        required: ['text', 'author']
      }
    }
  });

  try {
    const jsonStr = response.text || '{}';
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    return { 
      text: "Every small step counts, and you're doing just fine.", 
      author: "A friend" 
    };
  }
};

export const getDailyGreeting = async (userName: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Create a short, warm, and motivational one-sentence greeting for ${userName} about making 2026 their best year. It should be fresh, encouraging, and different from "ready to make 2026 your best year?". No emojis, keep it between 5-12 words.`,
  });
  return (response.text || 'ready to make 2026 your best year?').trim();
};

export const getFriendlyNudge = async (goalTitle: string, area: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Write a very short, warm, and friendly nudge for a user who hasn't updated their "${goalTitle}" goal in the "${area}" category for a while. 
    Sound like a supportive friend who cares about their dreams. 
    Mention that it's okay to take breaks, but you're here to help them take one tiny step when they're ready. 
    Keep it under 20 words. No emojis, just warm text.`,
  });
  return (response.text || '').trim();
};
