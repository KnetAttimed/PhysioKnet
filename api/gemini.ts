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

  // Aggressive Resilient Execution Engine: Retry with Key Rotation + Exponential Backoff
  let lastError = null;
  const modelsToTry = [model, "gemini-1.5-flash", "gemini-1.5-pro"]; // Update to stable fallback models
  const maxRetries = 5; // Increased retries for better success rate during spikes

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Model strategy: Stay on requested model for 2 tries, then fallback
    const currentModel = attempt < 2 ? model : (modelsToTry[attempt - 1] || modelsToTry[0]);
    const apiKey = keys[attempt % keys.length]; // Deterministic rotation through all keys
    const genAI = new GoogleGenAI({ apiKey });
    
    try {
      // Exponential Backoff: 1s, 2s, 4s, 8s...
      if (attempt > 0) {
        const backoff = Math.pow(2, attempt - 1) * 1000;
        console.log(`Backing off for ${backoff}ms before attempt ${attempt + 1}`);
        await new Promise(r => setTimeout(r, backoff));
      }
      
      console.log(`Attempt ${attempt + 1}/${maxRetries} using model: ${currentModel}`);
      
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
      const errorMessage = error.message || "";
      const is503 = errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded") || errorMessage.toLowerCase().includes("demand");
      const is429 = errorMessage.includes("429") || errorMessage.toLowerCase().includes("rate limit");

      console.error(`Attempt ${attempt + 1} failed (${is503 ? '503' : is429 ? '429' : 'Other'}):`, errorMessage);
      
      // If we've exhausted retries, exit loop
      if (attempt === maxRetries - 1) break;

      // Always retry on 503/429
      if (is503 || is429) continue;
      
      // For other errors, maybe check if it's worth retrying
      if (errorMessage.includes("safety") || errorMessage.includes("blocked")) {
        return res.status(400).json({ error: "Content flagged by safety filters.", details: errorMessage });
      }
    }
  }

  return res.status(503).json({ 
    error: "Neural Overload: All models are currently at peak capacity. Please try again in a few moments.",
    details: lastError?.message 
  });
}
