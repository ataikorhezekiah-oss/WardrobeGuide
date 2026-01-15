
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const PROMPT = `
You are a world-class AI fashion stylist. Your goal is to provide helpful, concise, and encouraging feedback on a user's outfit.

Analyze the outfit in the image and provide:
1.  A brief, one-paragraph critique focusing on color harmony, fit, and overall style cohesion.
2.  One or two actionable suggestions for improvement (e.g., "try swapping the shoes for white sneakers," or "adding a belt would define your waist").

Your tone should be positive and constructive.

If the image is unclear, the person is not wearing a clear outfit, or the image is inappropriate, respond with a friendly message: "Point the camera at your outfit, and I'll be happy to give you some style tips!"
`;


export async function getStyleSuggestion(base64ImageData: string): Promise<string> {
    try {
        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64ImageData,
            },
        };

        const textPart = {
            text: PROMPT,
        };
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: { parts: [textPart, imagePart] },
        });

        if (response.text) {
            return response.text;
        } else {
            return "I'm sorry, I couldn't generate a suggestion. The response was empty.";
        }

    } catch (error) {
        console.error("Gemini API call failed:", error);
        if (error instanceof Error) {
             return `Error analyzing image: ${error.message}`;
        }
        return "An unknown error occurred while analyzing the image.";
    }
}
