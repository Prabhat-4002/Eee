
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

export interface HelpResponse {
  answer: string;
  category: string;
  videoUrl?: string;
}

export const addToCartTool: FunctionDeclaration = {
  name: 'addItemToCart',
  parameters: {
    type: Type.OBJECT,
    description: 'Add a specific food item to the users shopping cart based on their voice request.',
    properties: {
      itemName: {
        type: Type.STRING,
        description: 'The name of the food item to add (e.g., Burgir, Milk, Apples).',
      },
    },
    required: ['itemName'],
  },
};

export const getHelpAnswer = async (question: string): Promise<HelpResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User asks about food delivery: ${question}. Provide a helpful, short answer specifically for a food delivery app named QFD. Mention that delivery times are 7am-10am and 4pm-7pm. If the question is about how to order, tracking, or payment, provide a dummy youtube link for a tutorial.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: {
              type: Type.STRING,
              description: 'The helpful text answer to the user query.',
            },
            category: {
              type: Type.STRING,
              description: 'Category of the help request (e.g., Payment, Delivery, App Guide).',
            },
            videoUrl: {
              type: Type.STRING,
              description: 'Optional URL to a help video (e.g., youtube link).',
            },
          },
          required: ['answer', 'category'],
        },
      },
    });

    const result = JSON.parse(response.text || '{}');
    return {
      answer: result.answer || "I'm here to help with your QFD delivery needs!",
      category: result.category || "General",
      videoUrl: result.videoUrl
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      answer: "Sorry, I am having trouble connecting to help center. Please call customer care at 9876543210.",
      category: "Error"
    };
  }
};
