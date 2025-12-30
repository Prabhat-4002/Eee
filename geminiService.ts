
import { GoogleGenAI } from "@google/genai";

// Use process.env.API_KEY directly in the named parameter object as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getHelpAnswer = async (question: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User asks about food delivery: ${question}. Provide a helpful, short answer specifically for a food delivery app named QFD. Mention that delivery times are 7am-10am and 4pm-7pm.`,
    });
    // Use .text property getter.
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Sorry, I am having trouble connecting to help center. Please call customer care.";
  }
};
