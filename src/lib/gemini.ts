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
- **Image Injection**: 2-3 specific Wikipedia tags. 
  - RULE: **ULTRA-VARIATION MANDATORY**. Never repeat the same diagram.
  - RULE: **RELEVANCE FIRST**. Only tag images that represent the *physiological mechanism* or *anatomical structure* described. 
  - RULE: Scan for bolded/italicized terms in your content and use those for your Tags if they are high-yield.
  - Example Tags: [IMAGE: Action_potential_mechanisms], [IMAGE: Ion_channel_gating], [IMAGE: Nephron_physiology], [IMAGE: Cardiac_cycle_diagram].
  - RULE: Append "_physiology" or "_structure" to tags to avoid generic art/photography.

Chapter: ${chapterContent.num} - ${chapterContent.title}
Topic: ${topic}`;

  let prompt = "";
  if (mode === "quiz") {
    prompt = `GENERATE: 1 High-Discrimination Multiple Choice Question on "${topic}". 
- Difficulty: USMLE Step 1 / Board Level.
- Layout: Question -> 4 Options -> Correct Answer -> Rationale.
- Rationale MUST include: 1. Correct Mechanism, 2. Why distractors are WRONG (Distractor Analysis).
- Response Format: JSON strictly.`;
  } else if (mode === "explain") {
    prompt = `CONSTRUCT: "Elite Mastery Sheet" for "${topic}".
- Section 1: Molecular Architecture (Ion kinetics/receptors).
- Section 2: Physiological Feedback Integration.
- Section 3: Comparative Table (Physiology vs. Specific Pathology).
- Section 4: Clinical Discriminants (Why it matters for an Elite Doctor).
- Style: Dense, Tabular, Precise.`;
  } else {
    prompt = `DECONSTRUCT: Clinical Case Study for "${topic}".
- Presentation: Complex multisystem case.
- Pathogenesis: The "Hidden" physiological breakage.
- Mastery Questions: 3 high-level questions on 'How would the $V_m$ change if...' or 'Effect of blocker X...'.`;
  }

  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODELS.FLASH,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: mode === "quiz" ? "application/json" : "text/plain",
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
