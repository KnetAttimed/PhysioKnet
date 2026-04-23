import { GoogleGenAI } from "@google/genai";

export const config = {
  maxDuration: 60, // Grant longer duration for AI responses if needed
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { model, contents, config: genConfig, systemInstruction } = req.body;
  
  const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
  const keys = rawKeys.split(",").map(k => k.trim()).filter(k => k.length > 0);

  if (keys.length === 0) {
    console.error("Vercel: All keys missing");
    return res.status(500).json({ error: "API Keys are not set on the server." });
  }

  const apiKey = keys[Math.floor(Math.random() * keys.length)];
  const genAI = new GoogleGenAI({ apiKey });

  try {
    const result = await (genAI as any).models.generateContent({
      model: model,
      contents: contents,
      config: {
        ...genConfig,
        systemInstruction: systemInstruction,
      },
    });

    return res.status(200).json({ text: result.text });
  } catch (error: any) {
    console.error("Vercel Gemini Error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate content" });
  }
}
