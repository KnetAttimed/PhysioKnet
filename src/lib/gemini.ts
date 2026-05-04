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

export interface Flashcard {
  front: string;
  back: string;
  reasoning: string;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = 3, // Increased retries
  backoff: number = 5000, // Increased initial backoff
): Promise<Response> {
  try {
    const response = await fetch(url, options);

    if (response.ok) return response;

    // 429 and 503 are usually transient or rate-limit related
    if ((response.status === 429 || response.status === 503) && retries > 0) {
      console.warn(
        `Gemini API Busy/Rate-Limited. Status ${response.status}. Retrying in ${backoff}ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, backoff));
      // Exponential backoff: increase wait time significantly for 429
      const nextBackoff = response.status === 429 ? backoff * 3 : backoff * 2;
      return fetchWithRetry(url, options, retries - 1, nextBackoff);
    }

    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
}

export async function generateStudyContent(
  mode: "quiz" | "explain" | "case" | "flashcard",
  chapterContent: { title: string; num: number },
  topic: string,
) {
  const systemInstruction = `You are the "Master Physiology Architect" for KnetPhysio. Your mission is to train the top 0.1% medical candidates using maximum intellectual density.

Core Directives:
1. **Zero Fluff**: Skip all greetings, transitions, and concluding summaries. Every word must serve a mechanistic purpose.
2. **Dense Hierarchy**: Use strict markdown nesting (## -> ### -> ####).
3. **Intellectual Brutality**: Use advanced language. Replace basic words with medical precision (e.g., use 'sequester' instead of 'keep', 'potentiate' instead of 'increase').
4. **Physio-Chemical Integration**: You MUST integrate Molecular Biology, Biophysics, and Clinical Medicine into a unified thread.

Language & Formatting:
- Respond in Thai (ภาษาไทย) for flow, but ALL Technical/Medical terms MUST remain in English.
- LaTeX for EVERYTHING quantitative ($pCO_2$, $Na^+/K^+$-ATPase, $\Delta G$).
- Emojis: Only ⚡ (High-Yield), 🧬 (Molecular), 🏥 (Clinical). Max 1 per section.
- **ARROW RULE**: NEVER use arrow emojis (⬆️, ⬇️) in clusters. Use clear English terms like "(Increased)" or "(Decreased)" if the direction is critical.
- **HEADER RULE**: Use standard markdown headers ONLY (e.g., "### Header Name"). NEVER put hashes at the end of a line (e.g., "### Title ###" is FORBIDDEN).

Content Architecture:
- **Molecular Trigger**: Start with the protein/ion-level event.
- **Feedback Loop breakage**: Explain how homeostasis fails in pathology.
- **Quantitative Table**: Must include a "Discriminator" column (The key value that confirms a diagnosis/state).
- **IMAGE INJECTION RULE**: Scan for key physiological entities (proteins, pathways, organs) in your content.
- **BOLDING RULE**: You MUST **bold** the names of the most critical physiological entities to trigger the "Visual Study Tokens" system.
- **Image Injection**: 2-3 specific Wikipedia tags. 
  - RULE: **ULTRA-VARIATION MANDATORY**. Never repeat the same diagram.
  - RULE: **RELEVANCE FIRST**. Only tag images that represent the *physiological mechanism* or *anatomical structure* described. 
  - RULE: Use bolded/italicized terms in your content for your Tags.
  - Example Tags: [IMAGE: Action_potential_mechanisms], [IMAGE: Ion_channel_gating], [IMAGE: Nephron_physiology].
  - RULE: Append "_physiology" or "_structure" to tags to avoid generic art/photography.

Chapter: ${chapterContent.num} - ${chapterContent.title}
Topic: ${topic}`;

  let prompt = "";
  if (mode === "quiz") {
    prompt = `GENERATE: 5 High-Discrimination Multiple Choice Questions on "${topic}". 
- Difficulty: USMLE Step 1 / Board Level.
- Explain concisely (1-2 sentences).
- Do NOT include any image tags in this mode.
- Response Format: JSON strictly as an array of objects with keys: "question", "options" (array of {letter, text}), "answer" (letter string), "explanation" (short text).
- IMPORTANT: If using LaTeX math, you MUST double escape all backslashes (e.g. \\\\sigma = \\\\frac) so it is valid JSON.`;
  } else if (mode === "explain") {
    prompt = `CONSTRUCT: "Elite Mastery Sheet" for "${topic}".
- Layout: Use very clean hierarchies, bullet points, and highlight important clinical tips with emojis (e.g., 💡, ⚡, 🧬, 🛑).
- Elements: Short, punchy sentences instead of long paragraphs. 
- Section 1: Molecular Architecture (Ion kinetics/receptors).
- Section 2: Physiological Feedback Integration.
- Section 3: Comparative Table (Physiology vs. Specific Pathology).
- Section 4: Clinical Discriminants (Why it matters for an Elite Doctor).
- Style: Highly scannable, visually appealing with Markdown bullet points and bold terms.`;
  } else if (mode === "flashcard") {
    prompt = `GENERATE: 10 Mechanistic Flashcards for "${topic}".
- Front: A precise physiological question or phenomenon.
- Back: The complete mechanistic explanation (The Core "Why").
- Reasoning: Why this is a high-yield concept for elite students.
- Response Format: JSON strictly as an array of objects. Example: [{"front": "Q...", "back": "A...", "reasoning": "R..."}]
- IMPORTANT: If using LaTeX math, you MUST double escape all backslashes (e.g. \\\\sigma = \\\\frac) so it is valid JSON.`;
  } else {
    prompt = `DECONSTRUCT: Clinical Case Study for "${topic}".
- Presentation: Complex multisystem case.
- Pathogenesis: The "Hidden" physiological breakage.
- Mastery Questions: 3 high-level questions on 'How would the $V_m$ change if...' or 'Effect of blocker X...'.`;
  }

  const response = await fetchWithRetry("/api/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODELS.FLASH,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType:
          mode === "quiz" || mode === "flashcard"
            ? "application/json"
            : "text/plain",
      },
      systemInstruction: { parts: [{ text: systemInstruction }] },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to generate content");
  }

  const data = await response.json();
  return data.text;
}
