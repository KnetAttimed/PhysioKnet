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

  // Resilient Execution Engine: Retry with Key Rotation + Model Fallback
  let lastError = null;
  const modelsToTry = [model, "gemini-3.1-pro-preview", "gemini-1.5-flash"]; // Fallback chain
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const currentModel = modelsToTry[attempt] || modelsToTry[0];
    const apiKey = keys[Math.floor(Math.random() * keys.length)];
    const genAI = new GoogleGenAI({ apiKey });
    
    try {
      // Small delay on retries
      if (attempt > 0) await new Promise(r => setTimeout(r, 1000 * attempt));
      
      console.log(`Attempt ${attempt + 1} using model: ${currentModel}`);
      
      const result = await (genAI as any).models.generateContent({
        model: currentModel,
        contents: contents,
        config: {
          ...genConfig,
          systemInstruction: systemInstruction,
        },
      });

      return res.status(200).json({ text: result.text });
    } catch (error: any) {
      lastError = error;
      console.error(`Attempt ${attempt + 1} failed:`, error.message);
      
      // If it's a 503 (High demand) or 429 (Rate limit), we retry. 
      // Otherwise, we might want to fail fast, but for robustness we'll just try next key/model.
      const status = error.status || (error.message?.includes("503") ? 503 : 500);
      if (status !== 503 && status !== 429 && attempt < maxRetries - 1) {
         // Some other error, but we still have retries
         continue;
      }
    }
  }

  return res.status(503).json({ 
    error: "Neural Overload: All models are currently at peak capacity. Please try again in a few moments.",
    details: lastError?.message 
  });
}
