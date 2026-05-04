import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  X,
  Zap,
  BookOpen,
  Stethoscope,
  ChevronRight,
} from "lucide-react";
import { CURRICULUM, Section, Chapter } from "../data/curriculum";

interface MasterySearchProps {
  onTopicSelect: (section: Section, chapter: Chapter, topic: string) => void;
}

export function MasterySearch({ onTopicSelect }: MasterySearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const allTopics = useMemo(() => {
    const items: {
      section: Section;
      chapter: Chapter;
      topic: string;
      type: "standard" | "elite";
    }[] = [];
    CURRICULUM.forEach((section) => {
      section.chapters.forEach((chapter) => {
        chapter.topics.forEach((topic) => {
          items.push({ section, chapter, topic, type: "standard" });
        });
        chapter.eliteTopics?.forEach((topic) => {
          items.push({ section, chapter, topic, type: "elite" });
        });
      });
    });
    return items;
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const search = query.toLowerCase();
    return allTopics
      .filter(
        (item) =>
          item.topic.toLowerCase().includes(search) ||
          item.chapter.title.toLowerCase().includes(search),
      )
      .slice(0, 8);
  }, [query, allTopics]);

  return (
    <>
      <div className="relative w-full max-w-2xl mx-auto mb-12">
        <div
          onClick={() => setIsOpen(true)}
          className="glass-card rounded-2xl flex items-center gap-4 p-4 cursor-text border border-white/5 hover:border-gemini-blue/30 transition-all group"
        >
          <Search className="w-5 h-5 text-gray-500 group-hover:text-gemini-blue transition-colors" />
          <span className="text-gray-500 font-sans text-sm md:text-base">
            Search for physiological mechanisms (e.g. RAAS, Action Potential)...
          </span>
          <div className="ml-auto hidden md:flex items-center gap-1.5 px-2 py-1 bg-[var(--card-bg)] rounded-lg border border-[var(--card-border)] text-[10px] text-[var(--secondary-text)] uppercase font-bold tracking-widest">
            <span className="text-[12px]">⌘</span> K
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[var(--app-bg)]/95 backdrop-blur-xl p-4 md:p-12 flex flex-col items-center"
          >
            <div className="w-full max-w-3xl flex flex-col h-full">
              <header className="flex items-center gap-4 mb-8">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gemini-blue" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search neural database..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl py-4 pl-14 pr-6 text-[var(--app-text)] text-xl md:text-2xl font-sans focus:outline-none focus:border-gemini-blue/50 transition-all placeholder:text-[var(--secondary-text)]"
                  />
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="p-4 hover:bg-[var(--card-bg)] rounded-2xl text-[var(--secondary-text)] hover:text-[var(--app-text)] transition-colors border border-[var(--card-border)]"
                >
                  <X className="w-6 h-6" />
                </button>
              </header>

              <div className="flex-1 overflow-y-auto space-y-3 custom-scroll">
                {query.trim() === "" ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="w-16 h-16 bg-[var(--card-bg)] rounded-full flex items-center justify-center mb-6">
                      <Sparkles className="w-8 h-8 text-gemini-blue/30" />
                    </div>
                    <h4 className="text-[var(--secondary-text)] font-sans mb-2">
                      Neural Search Ready
                    </h4>
                    <p className="text-[var(--secondary-text)] opacity-70 text-sm max-w-xs mx-auto">
                      Access any biological mechanism instantly. Try "Cardiac
                      Cycle" or "Sodium Channel".
                    </p>
                  </div>
                ) : filtered.length > 0 ? (
                  filtered.map((item, idx) => (
                    <motion.button
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={`${item.chapter.id}-${item.topic}`}
                      onClick={() => {
                        onTopicSelect(item.section, item.chapter, item.topic);
                        setIsOpen(false);
                        setQuery("");
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--card-border)] hover:border-gemini-blue/30 hover:bg-gemini-blue/5 group transition-all text-left"
                    >
                      <div
                        className={`p-3 rounded-xl ${item.type === "elite" ? "bg-amber-500/10 text-amber-500" : "bg-gemini-blue/10 text-gemini-blue"}`}
                      >
                        {item.type === "elite" ? (
                          <Sparkles className="w-5 h-5" />
                        ) : (
                          <BookOpen className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-[var(--app-text)] font-bold text-base md:text-lg group-hover:text-gemini-blue transition-colors font-sans flex items-center gap-2">
                          {item.topic}{" "}
                          {item.type === "elite" && (
                            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        <div className="text-[var(--secondary-text)] text-xs flex items-center gap-2">
                          <span>{item.section.title}</span>
                          <ChevronRight className="w-3 h-3" />
                          <span>
                            Ch. {item.chapter.num}: {item.chapter.title}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  ))
                ) : (
                  <div className="text-center py-20 text-[var(--secondary-text)] font-sans italic">
                    No matching neural pathways found for "{query}"
                  </div>
                )}
              </div>

              <footer className="mt-8 pt-6 border-t border-[var(--card-border)] flex justify-between items-center text-[10px] text-[var(--secondary-text)] uppercase tracking-widest font-bold">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Quick Navigation
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> Full Curriculum
                  </span>
                </div>
                <span>Search Engine v2.0 - Boron Edition</span>
              </footer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Sparkles({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
