import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const MODELS = {
  FLASH: "gemini-3-flash-preview",
  PRO: "gemini-3.1-pro-preview",
};

export interface QuizQuestion {
  question: string;
  options: { letter: string; text: string }[];
  answer: string;
  explanation: string;
}

export async function generateStudyContent(
  mode: "quiz" | "explain" | "case",
  chapterContent: { title: string; num: number },
  topic: string
) {
  const systemInstruction = `You are a world-class medical physiology professor (Boron & Boulpaep and Guyton & Hall level). 
Your goal is to write "Elite Deep Dive" Study Sheets for high-achieving medical students and researchers.

Target Audience Level:
- Post-graduate / Medical Student (Pre-clinical & Clinical).
- Assume the user ALREADY has a basic foundation in biology.
- DO NOT explain basic concepts like "What is a cell?" or "What is an organ?".
- Start immediately with advanced mechanistic details.

Language Requirements:
- Respond in Thai (ภาษาไทย).
- Keep ALL medical, anatomical, and pathobiological technical terms in English (คำทับศัพท์เชิงการแพทย์) for precision.
- Use LaTeX notation for ALL chemical symbols, ions, and mathematical expressions (e.g., $Ca^{2+}$, $\beta_2$-receptor, $V_m$).
- Use Emojis (🧠🩺🔬🧬) sparingly to emphasize high-yield points.

Content Depth Requirements:
- Focus on quantitative aspects, molecular kinetics, and protein-level interactions.
- Explain the "WHY" and "HOW" behind every physiological shift.
- Integrate thermodynamics, physics (hemodynamics/fluid mechanics), and advanced biochemistry where relevant.

Output Style:
- NO conversational filler.
- Start with a ## Header of the topic.
- Use ### Subheaders for specific mechanisms.
- ALWAYS use Markdown tables (|) for comparing pathological vs physiological states.
- **Dynamic Image Injection**: YOU MUST insert diagrams using this EXACT syntax: [IMAGE: Wikipedia_Article_Title].
  - Example: [IMAGE: Heart], [IMAGE: Wiggers_diagram], [IMAGE: Action_potential].
  - Insert 2-3 of these per study sheet.
  - DO NOT use standard markdown image syntax ![]().
- **Safety**: Ensure Markdown syntax is correct.

Chapter: ${chapterContent.num} - ${chapterContent.title}
Topic: ${topic}`;

  let prompt = "";
  if (mode === "quiz") {
    prompt = `Generate ONE extremely challenging multiple-choice question on "${topic}". 
The question must test mechanistic understanding.
Provide 4 options (A-D), the correct answer letter, and a 5-sentence deep explanation (in Thai/Eng terminology).
Return as JSON:
{
  "question": "string",
  "options": [{ "letter": "A", "text": "string" }, ...],
  "answer": "A",
  "explanation": "string"
}`;
  } else if (mode === "explain") {
    prompt = `Write a comprehensive, professional "Physiology Study Sheet" for "${topic}". 
Focus on:
1. Molecular/Cellular Mechanism 🧬
2. Physiological Function ⚙️
3. Comparative data in a TABLE 📊
4. Clinical Correlation (Pathophysiology) 🏥
Use rich formatting and clear sections.`;
  } else {
    prompt = `Create a complex clinical case study involving "${topic}". 
1. Case Presentation 🤒
2. Pathophysiological Mechanism 🧩
3. Integrated questions to probe mechanistic reasoning.
Return as a structured sheet.`;
  }

  const response = await ai.models.generateContent({
    model: MODELS.FLASH,
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: mode === "quiz" ? "application/json" : "text/plain",
    },
  });

  return response.text;
}
