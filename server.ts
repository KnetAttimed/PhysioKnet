import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Helper to get rotated keys
  const getKeys = () => {
    const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
    return rawKeys.split(",").map(k => k.trim()).filter(k => k.length > 0);
  };

  // Gemini API Proxy
  app.post("/api/gemini", async (req, res) => {
    try {
      const { model, contents, config, systemInstruction } = req.body;
      const keys = getKeys();
      
      if (keys.length === 0) {
        console.error("Critical: No GEMINI_API_KEY(S) set in process.env");
        return res.status(500).json({ error: "API Key is missing on the server." });
      }

      // Rotate/Select random key
      const apiKey = keys[Math.floor(Math.random() * keys.length)];
      console.log(`Using key: ...${apiKey.slice(-4)} (Total keys: ${keys.length})`);

      const genAI = new GoogleGenAI({ apiKey });
      const result = await (genAI as any).models.generateContent({
        model: model,
        contents: contents,
        config: {
          ...config,
          systemInstruction: systemInstruction,
        },
      });

      res.json({ text: result.text });
    } catch (error: any) {
      console.error("Gemini Proxy Error:", error);
      const isRateLimited = error.message?.includes("429") || error.message?.includes("Quota");
      const statusCode = isRateLimited ? 429 : 500;
      res.status(statusCode).json({ error: error.message || "Failed to generate content" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
