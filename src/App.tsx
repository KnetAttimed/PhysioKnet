import { useState, useCallback, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  Brain,
  RotateCcw,
  Send,
  BookOpen,
  Stethoscope,
  Sparkles,
  X,
  ExternalLink,
  Maximize2,
  Search,
  Info,
  Sun,
  Moon,
} from "lucide-react";

function ThemeToggle({
  theme,
  setTheme,
}: {
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
}) {
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="fixed bottom-6 right-6 z-[110] p-4 rounded-2xl glass-card glass-card-hover shadow-2xl flex items-center justify-center group"
    >
      <AnimatePresence mode="wait">
        {theme === "dark" ? (
          <motion.div
            key="moon"
            initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="w-6 h-6 text-gemini-cyan" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 45, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="w-6 h-6 text-amber-500" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
import { CURRICULUM, Section, Chapter } from "./data/curriculum";
import { generateStudyContent, QuizQuestion, Flashcard } from "./lib/gemini";

import { MasterySearch } from "./components/MasterySearch";

type View = "home" | "section" | "learn";
type Mode = "quiz" | "explain" | "case" | "flashcard";

function NeuralContent({ content }: { content: string }) {
  return (
    <div className="study-sheet">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
      >
        {content.replace(/\[IMAGE:\s*[^\]]+\]/g, "")}
      </ReactMarkdown>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<View>("home");
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [selectedSection, setSelectedSection] = useState<Section | null>(null);

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
  }, [theme]);

  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [learnMode, setLearnMode] = useState<Mode>("quiz");

  useEffect(() => {
    const path = location.pathname;
    if (path === "/") {
      setView("home");
      setSelectedSection(null);
    } else if (path.startsWith("/section/")) {
      const sectionId = path.split("/")[2];
      const section =
        CURRICULUM.find((s) => s.id === sectionId) || CURRICULUM[0];
      setSelectedSection(section);
      setView("section");
    } else if (path.startsWith("/learn/")) {
      const parts = path.split("/");
      const sectionId = parts[2];
      const chapterId = parts[3];
      const topicUrl = decodeURIComponent(parts[4]);
      const mode = parts[5] as Mode;

      const section =
        CURRICULUM.find((s) => s.id === sectionId) || CURRICULUM[0];
      const chapter =
        section.chapters.find((c) => c.id === chapterId) || section.chapters[0];

      setSelectedSection(section);
      if (
        !selectedChapter ||
        selectedChapter.id !== chapterId ||
        selectedTopic !== topicUrl ||
        learnMode !== mode
      ) {
        setSelectedChapter(chapter);
        setSelectedTopic(topicUrl);
        setLearnMode(mode);
        setMessages([]); // This forces startLearnSession to fetch new content
        setView("learn");
      }
    }
  }, [location.pathname]);

  const parseJSONResponse = (response: string) => {
    try {
      // Find the first '{' or '[' and the last '}' or ']'
      const firstBrace = response.indexOf("{");
      const lastBrace = response.lastIndexOf("}");
      const firstBracket = response.indexOf("[");
      const lastBracket = response.lastIndexOf("]");

      let start = -1;
      let end = -1;

      if (
        firstBrace !== -1 &&
        lastBrace !== -1 &&
        (firstBracket === -1 || firstBrace < firstBracket)
      ) {
        start = firstBrace;
        end = lastBrace;
      } else if (firstBracket !== -1 && lastBracket !== -1) {
        start = firstBracket;
        end = lastBracket;
      }

      let cleanJSON = response;
      if (start !== -1 && end !== -1 && end >= start) {
        cleanJSON = response.substring(start, end + 1);
      } else {
        cleanJSON = response
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();
      }

      let parsed;
      try {
        parsed = JSON.parse(cleanJSON);
      } catch (parseError) {
        // Fallback: fix unescaped backslashes, but ignore valid ones like \", \\, \n
        // Replace \ with \\ unless followed by ", \, n, r, t, b, f
        const escapedJSON = cleanJSON.replace(/\\(?!["\\nrtbf])/g, "\\\\");
        try {
          parsed = JSON.parse(escapedJSON);
        } catch (secondError) {
          console.error("Second parse error:", secondError);
          // If all fails, return a safe fallback object based on the context
          if (cleanJSON.includes("##") || cleanJSON.includes("**")) {
            // It's probably an explanation that got misrouted through the JSON parser.
            // This can happen if the model ignored JSON format instructions.
            throw new Error(
              "Neural Overload: Model generated a text explanation instead of structured JSON. Please try again.",
            );
          }
          if (cleanJSON.includes('"front"')) {
            return [
              {
                front: "Error Parsing Cards",
                back: "The neural construct failed to stabilize. Please try generating again.",
                reasoning: "Data stream corruption.",
              },
            ];
          } else if (cleanJSON.includes('"question"')) {
            return {
              question: "Error Parsing Quiz",
              options: [{ letter: "A", text: "Retry" }],
              answer: "A",
              explanation: "Please try generating again.",
            };
          }
          throw parseError; // throw original
        }
      }

      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].question) {
        return { quizzes: parsed };
      }
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].front) {
        return { flashcards: parsed };
      }

      // If it's an array but we only expected one object (like a quiz fallback), take the first
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed = parsed[0];
      }

      if (parsed.flashcards) {
        return { flashcards: parsed.flashcards };
      }
      if (parsed.flashcard && !parsed.front) {
        return { flashcards: [parsed.flashcard] };
      }
      if (parsed.quiz && !parsed.question) {
        return { quizzes: [parsed.quiz] };
      }

      if (parsed.question) {
        return { quizzes: [parsed] };
      }
      if (parsed.front) {
        return { flashcards: [parsed] };
      }
      return parsed;
    } catch (e) {
      console.error("JSON Parse Error:", e, response);
      return {};
    }
  };

  const switchMode = async (newMode: Mode) => {
    if (
      newMode === learnMode ||
      loading ||
      !selectedChapter ||
      !selectedTopic ||
      !selectedSection
    )
      return;
    navigate(
      `/learn/${selectedSection.id}/${selectedChapter.id}/${encodeURIComponent(selectedTopic)}/${newMode}`,
    );
  };
  const [messages, setMessages] = useState<
    {
      role: "user" | "assistant";
      content: string;
      quizzes?: QuizQuestion[];
      flashcards?: Flashcard[];
    }[]
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ questions: 0 });
  const [topicModal, setTopicModal] = useState<{
    chapter: Chapter;
    topic: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll disabled by user request to prevent jumping to bottom
  }, [messages, loading]);

  useEffect(() => {
    if (
      view === "learn" &&
      selectedChapter &&
      selectedTopic &&
      messages.length === 0 &&
      !loading
    ) {
      startLearnSession(selectedChapter, selectedTopic, learnMode, true);
    }
  }, [
    view,
    selectedChapter,
    selectedTopic,
    learnMode,
    messages.length,
    loading,
  ]);

  const startLearnSession = async (
    chapter: Chapter,
    topic: string,
    mode: Mode,
    skipNav = false,
  ) => {
    if (!skipNav && selectedSection) {
      setTopicModal(null);
      navigate(
        `/learn/${selectedSection.id}/${chapter.id}/${encodeURIComponent(topic)}/${mode}`,
      );
      // return here because navigation will trigger the useEffect, which triggers this function with skipNav = true
      return;
    }

    setSelectedChapter(chapter);
    setSelectedTopic(topic);
    setLearnMode(mode);
    setMessages([]);
    setView("learn");
    setTopicModal(null);

    setLoading(true);
    try {
      const response = await generateStudyContent(mode, chapter, topic);
      let parsed: any = {};
      if (mode === "quiz" || mode === "flashcard") {
        parsed = parseJSONResponse(response || "{}");
      }
      if (mode === "quiz") {
        setMessages([
          {
            role: "assistant",
            content: "Question Ready.",
            quizzes: parsed.quizzes || [],
          },
        ]);
      } else if (mode === "flashcard") {
        setMessages([
          {
            role: "assistant",
            content: "Flashcards Ready.",
            flashcards: parsed.flashcards || [],
          },
        ]);
      } else {
        setMessages([
          { role: "assistant", content: response || "Analysis complete." },
        ]);
      }
      setStats((s) => ({ ...s, questions: s.questions + 1 }));
    } catch (e: any) {
      let errorMsg = "Neural link failure. Please try again later.";
      if (e.message?.includes("Neural Overload")) {
        errorMsg = e.message;
      } else if (e.message?.includes("429") || e.message?.includes("Quota")) {
        errorMsg =
          "API Quota Exceeded (Free Tier). Please wait a few moments and try again.";
      }
      setMessages([{ role: "assistant", content: errorMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading || !selectedChapter || !selectedTopic) return;

    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const response = await generateStudyContent(
        learnMode,
        selectedChapter,
        `Follow-up query for ${selectedTopic}: ${userMsg}`,
      );
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response || "Synthesizing response..." },
      ]);
    } catch (e: any) {
      let errorMsg = "Neural sync timeout. Please try again.";
      if (e.message?.includes("Neural Overload")) {
        errorMsg = e.message;
      } else if (e.message?.includes("429") || e.message?.includes("Quota")) {
        errorMsg =
          "API Quota Exceeded (Free Tier). Please wait before asking more questions.";
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMsg },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const nextChallenge = async () => {
    if (!selectedChapter || !selectedTopic) return;
    setLoading(true);
    try {
      const response = await generateStudyContent(
        learnMode,
        selectedChapter,
        selectedTopic,
      );
      let parsed: any = {};
      if (learnMode === "quiz" || learnMode === "flashcard") {
        parsed = parseJSONResponse(response || "{}");
      }
      if (learnMode === "quiz") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Loading next question...",
            quizzes: parsed.quizzes || [],
          },
        ]);
      } else if (learnMode === "flashcard") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Loading next flashcards...",
            flashcards: parsed.flashcards || [],
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: response || "Further deep dive generated.",
          },
        ]);
      }
      setStats((s) => ({ ...s, questions: s.questions + 1 }));
    } catch (e: any) {
      let errorMsg = "Could not load next module.";
      if (e.message?.includes("Neural Overload")) {
        errorMsg = e.message;
      } else if (e.message?.includes("429") || e.message?.includes("Quota")) {
        errorMsg =
          "API Quota Exceeded (Free Tier). Please wait a few moments and try again.";
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMsg },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleNextTopic = () => {
    if (!selectedSection || !selectedChapter || !selectedTopic) return;

    let nextTopic = "";
    let nextChapter = selectedChapter;
    let nextSection = selectedSection;

    const topics = selectedChapter.topics;
    const eliteTopics = selectedChapter.eliteTopics || [];

    const topicIdx = topics.indexOf(selectedTopic);
    const eliteIdx = eliteTopics.indexOf(selectedTopic);

    if (topicIdx !== -1 && topicIdx < topics.length - 1) {
      nextTopic = topics[topicIdx + 1];
    } else if (topicIdx !== -1 && eliteTopics.length > 0) {
      nextTopic = eliteTopics[0];
    } else if (eliteIdx !== -1 && eliteIdx < eliteTopics.length - 1) {
      nextTopic = eliteTopics[eliteIdx + 1];
    } else {
      // End of chapter, find next chapter
      const chapterIdx = selectedSection.chapters.indexOf(selectedChapter);
      if (
        chapterIdx !== -1 &&
        chapterIdx < selectedSection.chapters.length - 1
      ) {
        nextChapter = selectedSection.chapters[chapterIdx + 1];
        nextTopic = nextChapter.topics[0];
      } else {
        // End of section, find next section
        const sectionIdx = CURRICULUM.indexOf(selectedSection);
        if (sectionIdx !== -1 && sectionIdx < CURRICULUM.length - 1) {
          nextSection = CURRICULUM[sectionIdx + 1];
          nextChapter = nextSection.chapters[0];
          nextTopic = nextChapter.topics[0];
        } else {
          // Wrap around or stop
          nextSection = CURRICULUM[0];
          nextChapter = nextSection.chapters[0];
          nextTopic = nextChapter.topics[0];
        }
      }
    }

    if (nextTopic) {
      navigate(
        `/learn/${nextSection.id}/${nextChapter.id}/${encodeURIComponent(nextTopic)}/${learnMode}`,
      );
      setTopicModal(null);
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-gemini-blue/30 selection:text-[var(--app-text)] gemini-gradient">
      <AnimatePresence mode="wait">
        <Routes
          location={location}
          key={location.pathname.split("/")[1] || "/"}
        >
          <Route
            path="/"
            element={
              <HomeView
                onSelectSection={(s) => {
                  navigate(`/section/${s.id}`);
                }}
                onSearchSelect={(section, chapter, topic) => {
                  navigate(`/section/${section.id}`);
                  setTopicModal({ chapter, topic });
                }}
              />
            }
          />
          <Route
            path="/section/:sectionId"
            element={
              selectedSection ? (
                <SectionView
                  section={selectedSection}
                  onBack={() => navigate("/")}
                  onTopicSelect={setTopicModal}
                  onFastStart={(chapter, topic, mode) =>
                    navigate(
                      `/learn/${selectedSection.id}/${chapter.id}/${encodeURIComponent(topic)}/${mode}`,
                    )
                  }
                />
              ) : (
                <div />
              )
            }
          />
          <Route
            path="/learn/*"
            element={
              selectedSection && selectedChapter && selectedTopic ? (
                <LearnView
                  section={selectedSection}
                  chapter={selectedChapter}
                  topic={selectedTopic}
                  mode={learnMode}
                  messages={messages}
                  loading={loading}
                  input={input}
                  setInput={setInput}
                  onSend={handleSendMessage}
                  onNext={nextChallenge}
                  onNextTopic={handleNextTopic}
                  onSwitchMode={switchMode}
                  onBack={() => navigate(`/section/${selectedSection.id}`)}
                  scrollRef={scrollRef}
                />
              ) : (
                <div />
              )
            }
          />
        </Routes>
      </AnimatePresence>

      <AnimatePresence>
        {topicModal && (
          <TopicModal
            chapter={topicModal.chapter}
            topic={topicModal.topic}
            onClose={() => setTopicModal(null)}
            onSelectMode={(mode) =>
              startLearnSession(topicModal.chapter, topicModal.topic, mode)
            }
          />
        )}
      </AnimatePresence>

      <ThemeToggle theme={theme} setTheme={setTheme} />
    </div>
  );
}

function HomeView({
  onSelectSection,
  onSearchSelect,
}: {
  onSelectSection: (s: Section) => void;
  onSearchSelect: (s: Section, c: Chapter, t: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-7xl mx-auto px-6 py-8 md:py-12"
    >
      <header className="mb-10 md:mb-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gemini-blue rounded-xl flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(30,144,255,0.5)]">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="font-sans text-[10px] tracking-[0.3em] text-gemini-cyan uppercase font-bold">
            Knet Attimed
          </span>
        </div>
        <h1 className="text-4xl md:text-8xl font-extrabold text-gradient mb-4 tracking-tight font-sans">
          KnetPhysio 🧠✨
        </h1>
        <p className="text-base md:text-xl text-[var(--secondary-text)] max-w-2xl font-light leading-relaxed font-sans mb-12">
          The ultimate Physiology Mastery Engine. Powered by mechanistic AI for
          elite students. 🚀
        </p>

        <MasterySearch onTopicSelect={onSearchSelect} />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CURRICULUM?.map((section) => (
          <button
            key={section.id}
            onClick={() => onSelectSection(section)}
            className="group relative glass-card glass-card-hover p-6 md:p-8 rounded-2xl md:rounded-3xl text-left overflow-hidden border border-white/5 hover:border-gemini-blue/30 transition-all"
          >
            <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-gradient-to-br from-white/10 to-transparent rounded-bl-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform" />
            <div className="text-3xl md:text-4xl mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-500">
              {section.icon}
            </div>
            <div className="font-sans text-[8px] md:text-[10px] tracking-widest text-[var(--secondary-text)] uppercase mb-1 md:mb-2">
              Section {section.section}
            </div>
            <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-[var(--app-text)] group-hover:text-gemini-blue transition-colors font-sans leading-tight">
              {section.title}
            </h3>
            <div className="flex items-center justify-between text-[10px] md:text-sm text-[var(--secondary-text)] font-sans">
              <span>{section.chapters.length} Sub-chapters</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 transition-transform">
                Explore →
              </span>
            </div>
            <div className="absolute bottom-0 left-0 h-1 bg-gemini-blue transition-all duration-500 group-hover:w-full w-0" />
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function SectionView({ section, onBack, onTopicSelect, onFastStart }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-5xl mx-auto px-6 py-8 md:py-12"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[var(--secondary-text)] hover:text-[var(--app-text)] mb-8 md:mb-12 transition-colors font-sans text-[10px] md:text-xs uppercase tracking-widest"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Dashboard 🏠
      </button>

      <div className="flex items-center gap-4 mb-2">
        <span className="text-3xl md:text-4xl">{section.icon}</span>
        <span className="font-sans text-[10px] md:text-xs text-gemini-cyan tracking-widest uppercase">
          Section {section.section} 📁
        </span>
      </div>
      <h2 className="text-3xl md:text-5xl font-extrabold mb-8 md:mb-12 text-gradient font-sans leading-tight">
        {section.title}
      </h2>

      <div className="space-y-4 md:space-y-6">
        {section.chapters?.map((chapter: Chapter) => (
          <div
            key={chapter.id}
            className="glass-card rounded-2xl md:rounded-3xl p-6 md:p-8 hover:border-[var(--card-border)] transition-colors"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-8 border-b border-[var(--card-border)] pb-6">
              <div className="flex-1">
                <div className="font-sans text-[10px] text-[var(--secondary-text)] uppercase mb-1">
                  Chapter {chapter.num}
                </div>
                <h4 className="text-xl md:text-2xl font-bold text-[var(--app-text)] leading-tight font-sans">
                  {chapter.title}
                </h4>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    onFastStart(chapter, chapter.topics[0], "quiz")
                  }
                  className="p-2.5 rounded-xl bg-gemini-cyan/10 border border-gemini-cyan/20 text-gemini-cyan hover:bg-gemini-cyan/20 transition-colors"
                  title="Quick Quiz"
                >
                  <Zap className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="text-[10px] font-sans text-[var(--secondary-text)] opacity-60 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-600 rounded-full" />
                  Standard Curriculum (Berne & Levy)
                </div>
                <div className="flex flex-wrap gap-2">
                  {chapter.topics?.map((topic, i) => (
                    <button
                      key={i}
                      onClick={() => onTopicSelect({ chapter, topic })}
                      className="group px-4 py-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl text-sm text-[var(--secondary-text)] hover:bg-gemini-blue/10 hover:text-gemini-blue transition-all hover:border-gemini-blue/30 font-sans"
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              {chapter.eliteTopics && chapter.eliteTopics.length > 0 && (
                <div>
                  <div className="text-[10px] font-sans text-amber-500/80 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    Elite Mechanistic Deep-Dive (Boron & Boulpaep)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {chapter.eliteTopics.map((topic, i) => (
                      <button
                        key={i}
                        onClick={() => onTopicSelect({ chapter, topic })}
                        className="group px-4 py-2 bg-[var(--elite-bg)] border border-[var(--elite-accent)]/20 rounded-xl text-sm text-[var(--elite-accent)] hover:bg-[var(--elite-accent)]/20 transition-all hover:border-[var(--elite-accent)]/40 font-sans flex items-center gap-2"
                      >
                        <div className="w-1 h-1 bg-[var(--elite-accent)] rounded-full" />
                        {topic}{" "}
                        <Zap className="w-3 h-3 text-amber-500 fill-amber-500 inline" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function TopicModal({ chapter, topic, onClose, onSelectMode }: any) {
  return (
    <motion.div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[var(--app-bg)]/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card w-full max-w-md rounded-3xl p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--card-bg)] rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-[var(--secondary-text)]" />
          </button>
        </div>

        <div className="font-sans text-[10px] text-gemini-cyan uppercase mb-2 tracking-[0.2em]">
          Select Analysis Mode
        </div>
        <h3 className="text-2xl font-bold text-[var(--app-text)] mb-2 leading-tight font-sans">
          {topic}
        </h3>
        <p className="text-[var(--secondary-text)] text-sm mb-8 font-sans">
          Chapter {chapter.num}: {chapter.title}
        </p>

        <div className="space-y-3">
          <ModeSelectBtn
            label="Quiz Module"
            sub="Neural knowledge assessment"
            icon={<Zap className="w-5 h-5 text-gemini-cyan" />}
            onClick={() => onSelectMode("quiz")}
          />
          <ModeSelectBtn
            label="Flashcards"
            sub="Key physiological concepts"
            icon={<Brain className="w-5 h-5 text-amber-500" />}
            onClick={() => onSelectMode("flashcard")}
          />
          <ModeSelectBtn
            label="Deep Explanation"
            sub="Molecular & cellular insights"
            icon={<BookOpen className="w-5 h-5 text-gemini-blue" />}
            onClick={() => onSelectMode("explain")}
          />
          <ModeSelectBtn
            label="Clinical Case"
            sub="Integrated patient scenario"
            icon={<Stethoscope className="w-5 h-5 text-gemini-purple" />}
            onClick={() => onSelectMode("case")}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function ModeSelectBtn({ label, sub, icon, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-[var(--gemini-blue)]/50 hover:bg-[var(--gemini-blue)]/5 transition-all text-left"
    >
      <div className="p-3 rounded-xl bg-[var(--card-bg)] shadow-sm">{icon}</div>
      <div>
        <div className="text-[var(--app-text)] font-bold text-sm tracking-tight">
          {label}
        </div>
        <div className="text-[var(--secondary-text)] text-xs">{sub}</div>
      </div>
    </button>
  );
}

function LearnView({
  section,
  chapter,
  topic,
  mode,
  messages,
  loading,
  input,
  setInput,
  onSend,
  onNext,
  onNextTopic,
  onSwitchMode,
  onBack,
  scrollRef,
}: any) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-screen flex flex-col pt-6 md:pt-12 px-6"
    >
      <div className="max-w-6xl w-full mx-auto flex flex-col h-full">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 md:mb-8">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={onBack}
              className="p-2 md:p-3 hover:bg-[var(--card-bg)] rounded-xl md:rounded-2xl transition-colors border border-[var(--card-border)] text-[var(--secondary-text)] hover:text-[var(--app-text)]"
            >
              <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>
            <div>
              <div className="font-sans text-[8px] md:text-[10px] text-[var(--secondary-text)] uppercase tracking-widest leading-none mb-1">
                {section.title} / Ch.{chapter.num}
              </div>
              <h3 className="text-lg md:text-xl font-bold text-[var(--app-text)] leading-none font-sans truncate max-w-[200px] md:max-w-none flex items-center gap-2">
                {topic}
                {chapter.eliteTopics?.includes(topic) && (
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                )}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <div className="flex items-center gap-2 md:gap-3 bg-[var(--card-bg)] p-1 rounded-xl md:rounded-2xl border border-[var(--card-border)] font-sans scale-90 md:scale-100 origin-right">
              <ModeTab
                active={mode === "quiz"}
                label="Quiz"
                onClick={() => onSwitchMode("quiz")}
              />
              <ModeTab
                active={mode === "flashcard"}
                label="Flash"
                onClick={() => onSwitchMode("flashcard")}
              />
              <ModeTab
                active={mode === "explain"}
                label="Explain"
                onClick={() => onSwitchMode("explain")}
              />
              <ModeTab
                active={mode === "case"}
                label="Case"
                onClick={() => onSwitchMode("case")}
              />
            </div>

            <button
              onClick={onNextTopic}
              className="px-4 py-2 bg-gemini-blue/10 hover:bg-gemini-blue/20 border border-gemini-blue/30 text-gemini-blue rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 group whitespace-nowrap"
            >
              <span>Next Topic</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto mb-4 md:mb-6 pr-2 md:pr-4 space-y-6 md:space-y-8 scroll-smooth"
        >
          {messages?.map((msg: any, i: number) => (
            <div
              key={i}
              className={`flex animate-in ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.quizzes && msg.quizzes.length > 0 ? (
                <div className="w-full space-y-4">
                  {msg.quizzes.map((q: QuizQuestion, qh: number) => (
                    <QuizCard
                      key={qh}
                      quiz={q}
                      index={qh + 1}
                      total={msg.quizzes.length}
                    />
                  ))}
                </div>
              ) : msg.flashcards && msg.flashcards.length > 0 ? (
                <FlashcardDeck flashcards={msg.flashcards} />
              ) : (
                <div
                  className={`max-w-[95%] md:max-w-[90%] p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] ${
                    msg.role === "user"
                      ? "bg-gemini-blue font-bold text-white shadow-lg shadow-gemini-blue/20"
                      : mode === "case"
                        ? "bg-[var(--card-bg)] shadow-md border border-[var(--card-border)] text-[var(--app-text)] font-sans text-sm md:text-lg leading-relaxed study-sheet"
                        : "glass-card border-none text-[var(--app-text)] font-sans text-sm md:text-lg leading-relaxed study-sheet"
                  }`}
                >
                  {mode === "case" && msg.role !== "user" && (
                    <div className="flex items-center gap-3 mb-6 border-b border-[var(--card-border)] pb-4">
                      <div className="p-3 bg-red-500/10 rounded-xl">
                        <Stethoscope className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-extrabold text-[var(--app-text)] m-0">
                          Clinical Case Study
                        </h3>
                        <p className="text-sm text-[var(--secondary-text)] font-medium">
                          Patient Analysis & Synthesis
                        </p>
                      </div>
                    </div>
                  )}
                  <NeuralContent content={msg.content} />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-3 font-mono text-xs text-[var(--secondary-text)] animate-pulse bg-[var(--card-bg)] px-6 py-4 rounded-3xl border border-[var(--card-border)]">
                <div className="w-1.5 h-1.5 bg-gemini-blue rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-gemini-purple rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-gemini-cyan rounded-full animate-bounce [animation-delay:-0.3s]" />
                Synthesizing modules...
              </div>
            </div>
          )}
        </div>

        <footer className="pb-8 space-y-4 font-sans">
          <div
            className={`flex gap-3 ${mode === "flashcard" ? "justify-center" : ""}`}
          >
            <button
              onClick={onNext}
              disabled={loading}
              className={`px-6 py-3 bg-[var(--card-bg)] hover:bg-gemini-blue/5 border border-[var(--card-border)] rounded-2xl text-sm font-medium transition-all flex items-center gap-2 group font-sans text-[var(--app-text)] ${mode === "flashcard" ? "w-full justify-center text-gemini-blue bg-gemini-blue/5 border-gemini-blue/20 hover:bg-gemini-blue/10" : ""}`}
            >
              <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />{" "}
              {mode === "flashcard"
                ? "Generate Next Flashcard Deck"
                : "Next Module"}
            </button>
            {mode !== "flashcard" && (
              <div className="flex-1 relative flex items-center shadow-2xl">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSend()}
                  placeholder="Probe neural brain..."
                  className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] py-3 px-6 pr-14 rounded-2xl text-sm text-[var(--app-text)] focus:outline-none focus:border-gemini-blue/50 transition-all font-sans placeholder:text-[var(--secondary-text)]"
                />
                <button
                  onClick={onSend}
                  disabled={loading || !input.trim()}
                  className="absolute right-2 p-2 text-gemini-blue hover:scale-110 transition-transform disabled:opacity-30"
                >
                  <FastSendIcon />
                </button>
              </div>
            )}
          </div>
        </footer>
      </div>
    </motion.div>
  );
}

function QuizCard({
  quiz,
  index,
  total,
}: {
  quiz: QuizQuestion;
  index?: number;
  total?: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="max-w-[95%] md:max-w-[90%] glass-card p-5 md:p-8 rounded-[1.5rem] md:rounded-3xl border-l-4 border-l-gemini-cyan relative overflow-hidden font-sans">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gemini-cyan/5 blur-3xl rounded-full" />
      <div className="font-sans text-[8px] md:text-[10px] text-gemini-cyan uppercase mb-2 md:mb-4 tracking-widest font-bold">
        Quiz Module {index && total ? `(${index}/${total})` : ""}
      </div>
      <div className="text-lg md:text-xl font-bold mb-6 md:mb-8 text-[var(--app-text)] leading-relaxed font-sans">
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex, rehypeRaw]}
        >
          {quiz?.question || ""}
        </ReactMarkdown>
      </div>

      <div className="grid gap-2 md:gap-3 mb-6 md:mb-8">
        {quiz?.options?.map((opt) => {
          const isCorrect = opt.letter === quiz.answer;
          const isSelected = opt.letter === selected;

          let borderColor = "var(--card-border)";
          let bgColor = "var(--card-bg)";

          if (revealed) {
            if (isCorrect) {
              borderColor = "var(--header-text)";
              bgColor = "var(--elite-bg)";
            } else if (isSelected) {
              borderColor = "rgba(239, 68, 68, 0.5)";
              bgColor = "rgba(239, 68, 68, 0.1)";
            }
          } else if (isSelected) {
            borderColor = "var(--color-gemini-blue)";
            bgColor = "rgba(138, 43, 226, 0.1)";
          }

          return (
            <button
              key={opt.letter}
              onClick={() => !revealed && setSelected(opt.letter)}
              disabled={revealed}
              className="p-3 md:p-4 rounded-xl md:rounded-2xl border text-left transition-all hover:bg-[var(--card-bg)] hover:border-gray-400/30 flex items-start gap-3 md:gap-4 group"
              style={{ borderColor, backgroundColor: bgColor }}
            >
              <span
                className={`w-5 h-5 md:w-6 md:h-6 rounded-md md:rounded-lg flex items-center justify-center font-bold text-[10px] md:text-xs shrink-0 transition-colors ${
                  isSelected
                    ? "bg-gemini-blue text-white"
                    : "bg-[var(--card-bg)] text-[var(--secondary-text)] border border-[var(--card-border)] group-hover:text-[var(--app-text)]"
                }`}
              >
                {opt.letter}
              </span>
              <div
                className={`transition-colors flex-1 text-xs md:text-base ${isSelected ? "text-[var(--app-text)] font-semibold" : "text-[var(--secondary-text)] group-hover:text-[var(--app-text)]"}`}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkMath, remarkGfm]}
                  rehypePlugins={[rehypeKatex, rehypeRaw]}
                  components={{
                    p: ({ node, children, ...props }) => (
                      <span {...props}>{children}</span>
                    ),
                  }}
                >
                  {opt.text}
                </ReactMarkdown>
              </div>
            </button>
          );
        })}
      </div>

      {!revealed ? (
        <button
          onClick={() => selected && setRevealed(true)}
          disabled={!selected}
          className="w-full py-3 md:py-4 bg-gemini-blue hover:bg-blue-600 disabled:opacity-50 text-white font-bold rounded-xl md:rounded-2xl transition-all shadow-[0_10px_20px_rgba(30,144,255,0.2)] active:scale-[0.98] text-sm md:text-base"
        >
          Check Answer
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 md:p-6 bg-white/5 rounded-xl md:rounded-2xl border border-white/10"
        >
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            {selected === quiz.answer ? (
              <span className="text-gemini-cyan font-bold text-[10px] md:text-sm tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-gemini-cyan rounded-full animate-ping" />
                CORRECT
              </span>
            ) : (
              <span className="text-red-400 font-bold text-[10px] md:text-sm tracking-widest font-sans">
                INCORRECT
              </span>
            )}
          </div>
          <div className="text-[var(--secondary-text)] opacity-90 text-xs md:text-sm leading-relaxed study-sheet prose-sm">
            <NeuralContent content={quiz.explanation} />
          </div>
        </motion.div>
      )}
    </div>
  );
}

function FlashcardDeck({ flashcards }: { flashcards: Flashcard[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const nextCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    }, 150);
  };

  const prevCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFlipped(false);
    setTimeout(() => {
      setCurrentIndex(
        (prev) => (prev - 1 + flashcards.length) % flashcards.length,
      );
    }, 150);
  };

  const flashcard = flashcards[currentIndex];

  if (!flashcard) return null;

  return (
    <div className="max-w-[95%] md:max-w-[90%] w-full flex flex-col items-center perspective-1000">
      <div className="flex w-full items-center justify-between mb-4 px-4 text-[var(--secondary-text)]">
        <button
          onClick={prevCard}
          className="p-2 bg-[var(--card-bg)] hover:bg-gemini-blue/20 rounded-full border border-[var(--card-border)] transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gemini-cyan" />
        </button>
        <div className="text-xs font-bold tracking-widest uppercase">
          Synthesizing Card {currentIndex + 1} of {flashcards.length}
        </div>
        <button
          onClick={nextCard}
          className="p-2 bg-[var(--card-bg)] hover:bg-gemini-blue/20 rounded-full border border-[var(--card-border)] transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gemini-cyan" />
        </button>
      </div>

      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{
          duration: 0.6,
          type: "spring",
          stiffness: 260,
          damping: 20,
        }}
        className="w-full relative preserve-3d cursor-pointer min-h-[300px]"
        onClick={() => setFlipped(!flipped)}
      >
        {/* Front Side */}
        <div className="absolute inset-0 backface-hidden glass-card p-8 rounded-3xl border-l-4 border-l-amber-500 flex flex-col items-center justify-center text-center">
          <div className="font-sans text-[10px] text-amber-500 uppercase mb-6 tracking-widest font-bold">
            Mechanistic Flashcard (Front)
          </div>
          <div className="text-xl md:text-2xl font-bold text-[var(--app-text)] leading-relaxed font-sans w-full">
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex, rehypeRaw]}
            >
              {flashcard.front}
            </ReactMarkdown>
          </div>
          <div className="mt-8 text-[var(--secondary-text)] text-xs animate-pulse">
            Click to Reveal Synthesis
          </div>
        </div>

        {/* Back Side */}
        <div className="absolute inset-0 backface-hidden glass-card p-8 rounded-3xl border-l-4 border-l-gemini-blue flex flex-col items-start justify-start overflow-y-auto overflow-x-hidden [transform:rotateY(180deg)]">
          <div className="font-sans text-[10px] text-gemini-blue uppercase mb-4 tracking-widest font-bold">
            Mechanistic Synthesis (Back)
          </div>
          <div className="text-[var(--app-text)] font-sans text-base md:text-lg leading-relaxed mb-6 w-full text-left study-sheet">
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex, rehypeRaw]}
            >
              {flashcard.back}
            </ReactMarkdown>
          </div>
          <div className="mt-auto p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 w-full">
            <div className="text-amber-500 text-[10px] uppercase font-bold tracking-widest mb-1 flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> Synthesis Reasoning
            </div>
            <p className="text-[var(--secondary-text)] text-xs italic">
              {flashcard.reasoning}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FastSendIcon() {
  return <Send className="w-5 h-5" />;
}

function ModeTab({ active, label, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
        active
          ? "bg-gemini-blue text-white shadow-lg shadow-gemini-blue/20"
          : "text-gray-500 hover:text-gray-300"
      }`}
    >
      {label}
    </div>
  );
}
