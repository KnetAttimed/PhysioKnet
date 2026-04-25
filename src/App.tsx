import { useState, useCallback, useEffect, useRef } from "react";
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
  Moon
} from "lucide-react";

function ThemeToggle({ theme, setTheme }: { theme: "dark" | "light", setTheme: (t: "dark" | "light") => void }) {
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
import { generateStudyContent, QuizQuestion } from "./lib/gemini";
import { DynamicWikiImage } from "./components/DynamicWikiImage";

import { MasterySearch } from "./components/MasterySearch";
import { HemodynamicPlot } from "./components/HemodynamicPlot";

type View = "home" | "section" | "learn";
type Mode = "quiz" | "explain" | "case";

export const getImageSearchUrl = (alt: string) => {
  const cleanAlt = alt.replace(/^PHYS-SEARCH:\s*/i, "").trim();
  return `https://www.google.com/search?q=${encodeURIComponent(cleanAlt + " clinical physiology diagram")}&tbm=isch`;
};

function NeuralContent({ content, onImageExpand }: { content: string, onImageExpand: (url: string | null) => void }) {
  const parts = content.split(/(\[IMAGE:\s*[^\]]+\]|\[HEMODYNAMIC_PLOT\])/g);
  
  return (
    <div className="study-sheet">
      {parts.map((part, index) => {
        const match = part.match(/\[IMAGE:\s*([^\]]+)\]/);
        if (match) {
          const title = match[1].trim();
          return <DynamicWikiImage key={index} title={title} onExpand={(url) => onImageExpand(url)} />;
        }
        if (part === "[HEMODYNAMIC_PLOT]") {
           return <HemodynamicPlot key={index} />;
        }
        return (
          <ReactMarkdown 
            key={index}
            remarkPlugins={[remarkMath, remarkGfm]} 
            rehypePlugins={[rehypeKatex, rehypeRaw]}
          >
            {part}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<View>("home");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
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
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  
  const switchMode = async (newMode: Mode) => {
    if (newMode === learnMode || loading || !selectedChapter || !selectedTopic) return;
    setLearnMode(newMode);
    setLoading(true);
    try {
      const response = await generateStudyContent(newMode, selectedChapter, selectedTopic);
      if (newMode === "quiz") {
        const quiz: QuizQuestion = JSON.parse(response || "{}");
        setMessages([{ role: "assistant", content: `Switching to ${newMode.toUpperCase()} module...`, quiz }]);
      } else {
        setMessages([{ role: "assistant", content: response || "Analysis complete." }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Error switching modes." }]);
    } finally {
      setLoading(false);
    }
  };
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; quiz?: QuizQuestion }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ questions: 0 });
  const [topicModal, setTopicModal] = useState<{ chapter: Chapter, topic: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll disabled by user request to prevent jumping to bottom
    /* 
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    */
  }, [messages, loading]);

  const startLearnSession = async (chapter: Chapter, topic: string, mode: Mode) => {
    setSelectedChapter(chapter);
    setSelectedTopic(topic);
    setLearnMode(mode);
    setMessages([]);
    setView("learn");
    setTopicModal(null);
    
    setLoading(true);
    try {
      const response = await generateStudyContent(mode, chapter, topic);
      if (mode === "quiz") {
        const quiz: QuizQuestion = JSON.parse(response || "{}");
        setMessages([{ role: "assistant", content: "Mechanism Challenge Ready. (แบบทดสอบระบบกลไกพร้อมแล้ว)", quiz }]);
      } else {
        setMessages([{ role: "assistant", content: response || "Analysis complete." }]);
      }
      setStats(s => ({ ...s, questions: s.questions + 1 }));
    } catch (e: any) {
      const errorMsg = e.message?.includes("Neural Overload") ? e.message : "Neural link failure. Please try again later.";
      setMessages([{ role: "assistant", content: errorMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading || !selectedChapter || !selectedTopic) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const response = await generateStudyContent("explain", selectedChapter, `Follow-up query for ${selectedTopic}: ${userMsg}`);
      setMessages(prev => [...prev, { role: "assistant", content: response || "Synthesizing response..." }]);
    } catch (e: any) {
      const errorMsg = e.message?.includes("Neural Overload") ? e.message : "Neural sync timeout. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: errorMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const nextChallenge = async () => {
    if (!selectedChapter || !selectedTopic) return;
    setLoading(true);
    try {
      const response = await generateStudyContent(learnMode, selectedChapter, selectedTopic);
      if (learnMode === "quiz") {
        const quiz: QuizQuestion = JSON.parse(response || "{}");
        setMessages(prev => [...prev, { role: "assistant", content: "Identifying new mechanism pathways...", quiz }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: response || "Further deep dive generated." }]);
      }
      setStats(s => ({ ...s, questions: s.questions + 1 }));
    } catch (e: any) {
      const errorMsg = e.message?.includes("Neural Overload") ? e.message : "Could not load next module.";
      setMessages(prev => [...prev, { role: "assistant", content: errorMsg }]);
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
      if (chapterIdx !== -1 && chapterIdx < selectedSection.chapters.length - 1) {
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
      setSelectedSection(nextSection);
      startLearnSession(nextChapter, nextTopic, learnMode);
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-gemini-blue/30 selection:text-[var(--app-text)] gemini-gradient">
      <AnimatePresence mode="wait">
        {view === "home" && (
          <HomeView 
            onSelectSection={(s) => { setSelectedSection(s); setView("section"); }} 
            onSearchSelect={(section, chapter, topic) => {
              setSelectedSection(section);
              setView("section");
              setTopicModal({ chapter, topic });
            }}
          />
        )}
        {view === "section" && selectedSection && (
          <SectionView 
            section={selectedSection} 
            onBack={() => setView("home")} 
            onTopicSelect={setTopicModal}
            onFastStart={startLearnSession}
          />
        )}
        {view === "learn" && selectedSection && selectedChapter && selectedTopic && (
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
            onImageExpand={setFullScreenImage}
            onBack={() => setView("section")}
            scrollRef={scrollRef}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {topicModal && (
          <TopicModal 
            chapter={topicModal.chapter}
            topic={topicModal.topic}
            onClose={() => setTopicModal(null)}
            onSelectMode={(mode) => startLearnSession(topicModal.chapter, topicModal.topic, mode)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fullScreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullScreenImage(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 bg-black/90 backdrop-blur-xl cursor-zoom-out"
          >
            <motion.div
              layoutId={fullScreenImage}
              className="relative max-w-7xl w-full h-full flex flex-col items-center justify-center"
            >
              <img 
                src={fullScreenImage} 
                alt="Full preview"
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-0 right-0 m-4 flex gap-2">
                <a 
                  href={fullScreenImage} 
                  target="_blank" 
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
                  title="Open original source"
                >
                  <ExternalLink className="w-8 h-8" />
                </a>
                <a 
                  href={getImageSearchUrl("physiology diagram")} 
                  target="_blank" 
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
                  title="Search for this on Google"
                >
                  <Search className="w-8 h-8" />
                </a>
                <button 
                  onClick={() => setFullScreenImage(null)}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <ThemeToggle theme={theme} setTheme={setTheme} />
    </div>
  );
}

function HomeView({ onSelectSection, onSearchSelect }: { onSelectSection: (s: Section) => void, onSearchSelect: (s: Section, c: Chapter, t: string) => void }) {
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
          <span className="font-sans text-[10px] tracking-[0.3em] text-gemini-cyan uppercase font-bold">Knet Attimed</span>
        </div>
        <h1 className="text-4xl md:text-8xl font-extrabold text-gradient mb-4 tracking-tight font-sans">
          KnetPhysio 🧠✨
        </h1>
        <p className="text-base md:text-xl text-[var(--secondary-text)] max-w-2xl font-light leading-relaxed font-sans mb-12">
          The ultimate Physiology Mastery Engine. Powered by mechanistic AI for elite students. 🚀
        </p>

        <MasterySearch 
          onTopicSelect={onSearchSelect} 
        />
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CURRICULUM?.map((section) => (
          <button
            key={section.id}
            onClick={() => onSelectSection(section)}
            className="group relative glass-card glass-card-hover p-6 md:p-8 rounded-2xl md:rounded-3xl text-left overflow-hidden border border-white/5 hover:border-gemini-blue/30 transition-all"
          >
            <div className="absolute top-0 right-0 w-24 md:w-32 h-24 md:h-32 bg-gradient-to-br from-white/10 to-transparent rounded-bl-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform" />
            <div className="text-3xl md:text-4xl mb-4 md:mb-6 group-hover:scale-110 transition-transform duration-500">{section.icon}</div>
            <div className="font-sans text-[8px] md:text-[10px] tracking-widest text-[var(--secondary-text)] uppercase mb-1 md:mb-2">Section {section.section}</div>
            <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-[var(--app-text)] group-hover:text-gemini-blue transition-colors font-sans leading-tight">{section.title}</h3>
            <div className="flex items-center justify-between text-[10px] md:text-sm text-[var(--secondary-text)] font-sans">
              <span>{section.chapters.length} Sub-chapters</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 transition-transform">Explore →</span>
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
      <button onClick={onBack} className="flex items-center gap-2 text-[var(--secondary-text)] hover:text-[var(--app-text)] mb-8 md:mb-12 transition-colors font-sans text-[10px] md:text-xs uppercase tracking-widest">
        <ChevronLeft className="w-4 h-4" /> Back to Dashboard 🏠
      </button>

      <div className="flex items-center gap-4 mb-2">
        <span className="text-3xl md:text-4xl">{section.icon}</span>
        <span className="font-sans text-[10px] md:text-xs text-gemini-cyan tracking-widest uppercase">Section {section.section} 📁</span>
      </div>
      <h2 className="text-3xl md:text-5xl font-extrabold mb-8 md:mb-12 text-gradient font-sans leading-tight">{section.title}</h2>

      <div className="space-y-4 md:space-y-6">
        {section.chapters?.map((chapter: Chapter) => (
          <div key={chapter.id} className="glass-card rounded-2xl md:rounded-3xl p-6 md:p-8 hover:border-[var(--card-border)] transition-colors">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 mb-6 md:mb-8 border-b border-[var(--card-border)] pb-6">
              <div className="flex-1">
                <div className="font-sans text-[10px] text-[var(--secondary-text)] uppercase mb-1">Chapter {chapter.num}</div>
                <h4 className="text-xl md:text-2xl font-bold text-[var(--app-text)] leading-tight font-sans">{chapter.title}</h4>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => onFastStart(chapter, chapter.topics[0], "quiz")}
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
                        {topic} <Zap className="w-3 h-3 text-amber-500 fill-amber-500 inline" />
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
          <button onClick={onClose} className="p-2 hover:bg-[var(--card-bg)] rounded-xl transition-colors">
            <X className="w-5 h-5 text-[var(--secondary-text)]" />
          </button>
        </div>
        
        <div className="font-sans text-[10px] text-gemini-cyan uppercase mb-2 tracking-[0.2em]">Select Analysis Mode</div>
        <h3 className="text-2xl font-bold text-[var(--app-text)] mb-2 leading-tight font-sans">{topic}</h3>
        <p className="text-[var(--secondary-text)] text-sm mb-8 font-sans">Chapter {chapter.num}: {chapter.title}</p>

        <div className="space-y-3">
          <ModeSelectBtn 
            label="Quiz Module" 
            sub="Neural mechanism validation"
            icon={<Zap className="w-5 h-5 text-gemini-cyan" />} 
            onClick={() => onSelectMode("quiz")} 
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
        <div className="text-[var(--app-text)] font-bold text-sm tracking-tight">{label}</div>
        <div className="text-[var(--secondary-text)] text-xs">{sub}</div>
      </div>
    </button>
  );
}

function LearnView({ 
  section, chapter, topic, mode, messages, loading, input, setInput, onSend, onNext, onNextTopic, onSwitchMode, onImageExpand, onBack, scrollRef 
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
            <button onClick={onBack} className="p-2 md:p-3 hover:bg-[var(--card-bg)] rounded-xl md:rounded-2xl transition-colors border border-[var(--card-border)] text-[var(--secondary-text)] hover:text-[var(--app-text)]">
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
              <ModeTab active={mode === "quiz"} label="Quiz" onClick={() => onSwitchMode("quiz")} />
              <ModeTab active={mode === "explain"} label="Explain" onClick={() => onSwitchMode("explain")} />
              <ModeTab active={mode === "case"} label="Case" onClick={() => onSwitchMode("case")} />
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
            <div key={i} className={`flex animate-in ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.quiz ? (
                <QuizCard quiz={msg.quiz} onImageExpand={onImageExpand} />
              ) : (
                <div className={`max-w-[95%] md:max-w-[90%] p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] ${
                  msg.role === "user" 
                    ? "bg-gemini-blue font-bold text-white shadow-lg shadow-gemini-blue/20" 
                    : "glass-card border-none text-[var(--app-text)] font-sans text-sm md:text-lg leading-relaxed study-sheet"
                }`}>
                   <NeuralContent content={msg.content} onImageExpand={onImageExpand} />
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
          <div className="flex gap-3">
            <button 
              onClick={onNext}
              disabled={loading}
              className="px-6 py-3 bg-[var(--card-bg)] hover:bg-gemini-blue/5 border border-[var(--card-border)] rounded-2xl text-sm font-medium transition-all flex items-center gap-2 group font-sans text-[var(--app-text)]"
            >
              <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" /> Next Module
            </button>
            <div className="flex-1 relative flex items-center">
              <input 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onSend()}
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
          </div>
        </footer>
      </div>
    </motion.div>
  );
}

function QuizCard({ quiz, onImageExpand }: { quiz: QuizQuestion, onImageExpand: (url: string | null) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="max-w-[95%] md:max-w-[90%] glass-card p-5 md:p-8 rounded-[1.5rem] md:rounded-3xl border-l-4 border-l-gemini-cyan relative overflow-hidden font-sans">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gemini-cyan/5 blur-3xl rounded-full" />
      <div className="font-sans text-[8px] md:text-[10px] text-gemini-cyan uppercase mb-2 md:mb-4 tracking-widest font-bold">Mechanism Validation</div>
      <h4 className="text-lg md:text-xl font-bold mb-6 md:mb-8 text-[var(--app-text)] leading-relaxed font-sans">{quiz?.question}</h4>
      
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
              <span className={`w-5 h-5 md:w-6 md:h-6 rounded-md md:rounded-lg flex items-center justify-center font-bold text-[10px] md:text-xs shrink-0 transition-colors ${
                isSelected ? "bg-gemini-blue text-white" : "bg-[var(--card-bg)] text-[var(--secondary-text)] border border-[var(--card-border)] group-hover:text-[var(--app-text)]"
              }`}>
                {opt.letter}
              </span>
              <div className={`transition-colors flex-1 text-xs md:text-base ${isSelected ? "text-[var(--app-text)] font-semibold" : "text-[var(--secondary-text)] group-hover:text-[var(--app-text)]"}`}>
                <ReactMarkdown 
                  remarkPlugins={[remarkMath, remarkGfm]} 
                  rehypePlugins={[rehypeKatex, rehypeRaw]}
                  components={{
                    p: ({ node, children, ...props }) => <span {...props}>{children}</span>
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
          Confirm Mechanism
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
                NEURAL SYNC SUCCESSFUL
              </span>
            ) : (
              <span className="text-red-400 font-bold text-[10px] md:text-sm tracking-widest font-sans">SYSTEM MISALIGNMENT</span>
            )}
          </div>
          <div className="text-[var(--secondary-text)] opacity-90 text-xs md:text-sm leading-relaxed prose prose-invert prose-sm">
             <NeuralContent content={quiz.explanation} onImageExpand={onImageExpand} />
          </div>
        </motion.div>
      )}
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
      active ? "bg-gemini-blue text-white shadow-lg shadow-gemini-blue/20" : "text-gray-500 hover:text-gray-300"
    }`}>
      {label}
    </div>
  );
}
