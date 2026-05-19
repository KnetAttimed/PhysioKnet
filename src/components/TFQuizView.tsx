import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, Zap, Play, Check, X, ShieldAlert } from "lucide-react";
import { CURRICULUM, Section, Chapter } from "../data/curriculum";
import { generateTFQuiz, TFQuestion } from "../lib/gemini";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

export function TFQuizView({ onBack }: { onBack: () => void }) {
  const [setupMode, setSetupMode] = useState(true);
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState(10);
  
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<TFQuestion[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answeredState, setAnsweredState] = useState<{
    answered: boolean;
    userAnswer?: boolean;
    isCorrect?: boolean;
  }>({ answered: false });

  const handleStart = async () => {
    if (selectedSectionIds.length === 0 && selectedChapterIds.length === 0) return;
    setLoading(true);
    
    try {
      const activeChapters: string[] = [];
      if (selectedChapterIds.length > 0) {
        selectedChapterIds.forEach(cid => {
          for (const s of CURRICULUM) {
            const chap = s.chapters.find(c => c.id === cid);
            if (chap) activeChapters.push(`${s.title} - ${chap.title}`);
          }
        });
      } else {
        selectedSectionIds.forEach(sid => {
          const sec = CURRICULUM.find(s => s.id === sid);
          if (sec) activeChapters.push(`Everything in ${sec.title}`);
        });
      }
      
      const res = await generateTFQuiz(activeChapters.join("\\n"), numQuestions);
      setQuestions(res);
      setSetupMode(false);
      setCurrentQuestionIdx(0);
      setScore(0);
      setAnsweredState({ answered: false });
    } catch (e) {
      console.error(e);
      alert("Failed to generate quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (val: boolean) => {
    if (answeredState.answered) return;
    const isCorrect = questions[currentQuestionIdx].answer === val;
    if (isCorrect) setScore(s => s + 1);
    setAnsweredState({ answered: true, userAnswer: val, isCorrect });
  };

  const handleNext = () => {
    setCurrentQuestionIdx(idx => idx + 1);
    setAnsweredState({ answered: false });
  };

  if (!setupMode && questions.length > 0) {
    if (currentQuestionIdx >= questions.length) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="max-w-2xl mx-auto py-24 px-6 text-center"
        >
          <div className="text-6xl mb-6">🏆</div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--app-text)] font-sans mb-4">
            Sprint Complete!
          </h2>
          <div className="text-8xl font-bold text-emerald-500 my-10 font-sans tracking-tighter">
            {score}<span className="text-4xl text-[var(--secondary-text)]">/{questions.length}</span>
          </div>
          <p className="text-xl text-[var(--secondary-text)] font-sans mb-12">
             {score === questions.length ? "Perfect score! You're a physiology master." :
              score > questions.length * 0.7 ? "Great job! A solid understanding of the concepts." :
              "Keep studying! Review the topics to strengthen your foundation."}
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => {
                setSetupMode(true);
                setQuestions([]);
              }}
              className="bg-gemini-blue text-white px-8 py-4 rounded-2xl font-bold hover:bg-gemini-blue/90 transition-colors font-sans text-lg shadow-lg shadow-gemini-blue/20"
            >
              Start New Sprint
            </button>
          </div>
        </motion.div>
      );
    }

    const q = questions[currentQuestionIdx];
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="max-w-3xl mx-auto py-12 px-6"
      >
        <button
          onClick={() => setSetupMode(true)}
          className="flex items-center gap-2 text-[var(--secondary-text)] hover:text-[var(--app-text)] transition-colors mb-8 font-sans text-xs tracking-widest uppercase font-bold"
        >
          <ChevronLeft className="w-4 h-4" /> Exit Quiz
        </button>

        <div className="flex justify-between items-center mb-8 font-sans">
          <div className="text-gemini-cyan font-bold tracking-widest uppercase text-sm">Question {currentQuestionIdx + 1} / {questions.length}</div>
          <div className="text-emerald-500 font-bold bg-emerald-500/10 px-4 py-1.5 rounded-full">Score: {score}</div>
        </div>

        <div className="glass-card p-8 md:p-12 rounded-3xl mb-8">
          <div className="text-2xl md:text-3xl font-bold font-sans text-[var(--app-text)] leading-tight mb-8">
            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
              {q.question}
            </ReactMarkdown>
          </div>
          
          <div className="grid grid-cols-2 gap-4 h-32">
            <button
              onClick={() => handleAnswer(true)}
              disabled={answeredState.answered}
              className={`rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 font-bold text-xl
                ${answeredState.answered 
                  ? answeredState.userAnswer === true
                    ? answeredState.isCorrect ? 'border-emerald-500 bg-emerald-500/20 text-emerald-500' : 'border-rose-500 bg-rose-500/20 text-rose-500'
                    : 'border-white/5 opacity-50'
                  : 'border-white/10 hover:border-emerald-500/50 hover:bg-white/5'
                }`}
            >
              <Check className="w-8 h-8" /> TRUE
            </button>
            <button
              onClick={() => handleAnswer(false)}
              disabled={answeredState.answered}
              className={`rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 font-bold text-xl
                ${answeredState.answered 
                  ? answeredState.userAnswer === false
                    ? answeredState.isCorrect ? 'border-emerald-500 bg-emerald-500/20 text-emerald-500' : 'border-rose-500 bg-rose-500/20 text-rose-500'
                    : 'border-white/5 opacity-50'
                  : 'border-white/10 hover:border-rose-500/50 hover:bg-white/5'
                }`}
            >
              <X className="w-8 h-8" /> FALSE
            </button>
          </div>
        </div>

        <AnimatePresence>
          {answeredState.answered && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="glass-card p-6 md:p-8 rounded-2xl border border-white/10"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full mt-1 ${answeredState.isCorrect ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                  {answeredState.isCorrect ? <Check className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className={`text-lg font-bold mb-2 font-sans ${answeredState.isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {answeredState.isCorrect ? 'Correct!' : 'Incorrect'}
                  </h4>
                  <div className="text-[var(--secondary-text)] font-sans leading-relaxed text-sm md:text-base">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {q.explanation}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleNext}
                  className="bg-gemini-blue text-white px-8 py-3 rounded-xl font-bold hover:bg-gemini-blue/90 transition-colors flex items-center gap-2"
                >
                  {currentQuestionIdx < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                  <ChevronLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl mx-auto py-12 px-6"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-[var(--secondary-text)] hover:text-[var(--app-text)] transition-colors mb-8 font-sans text-xs tracking-widest uppercase font-bold"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="mb-12">
        <div className="flex items-center gap-4 mb-2">
          <span className="text-4xl text-amber-500"><Zap className="fill-amber-500" /></span>
          <span className="font-sans text-xs text-amber-500 tracking-widest uppercase font-bold">
            Section VIII
          </span>
        </div>
        <h2 className="text-4xl md:text-5xl font-extrabold text-gradient font-sans leading-tight">
          True / False Sprint
        </h2>
        <p className="text-[var(--secondary-text)] mt-4 max-w-2xl text-lg">
          Rapid-fire evaluation. Select your topics, set the intensity, and test your physiological reflexes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 rounded-3xl">
            <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
              <h3 className="text-xl font-bold font-sans">Select Content</h3>
              <button
                onClick={() => {
                  if (selectedSectionIds.length === CURRICULUM.length) {
                    setSelectedSectionIds([]);
                    setSelectedChapterIds([]);
                  } else {
                    setSelectedSectionIds(CURRICULUM.map(s => s.id));
                    setSelectedChapterIds([]);
                  }
                }}
                className="text-xs font-bold text-gemini-blue uppercase tracking-widest hover:text-gemini-cyan transition-colors"
              >
                {selectedSectionIds.length === CURRICULUM.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              {CURRICULUM.map(section => {
                const isSecSelected = selectedSectionIds.includes(section.id);
                return (
                  <div key={section.id} className="border border-white/5 rounded-2xl p-4 bg-white/5">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 rounded border-gray-600 text-gemini-blue focus:ring-gemini-blue/50"
                        checked={isSecSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSectionIds(prev => [...prev, section.id]);
                            setSelectedChapterIds(prev => prev.filter(cid => !section.chapters.some(c => c.id === cid)));
                          } else {
                            setSelectedSectionIds(prev => prev.filter(id => id !== section.id));
                          }
                        }}
                      />
                      <span className="font-bold text-lg">{section.icon} {section.title}</span>
                    </label>
                    
                    {!isSecSelected && (
                      <div className="ml-8 mt-4 space-y-2">
                        {section.chapters.map(chapter => (
                          <label key={chapter.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white/5 rounded-xl transition-colors">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-gray-600 text-emerald-500 focus:ring-emerald-500/50"
                              checked={selectedChapterIds.includes(chapter.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedChapterIds(prev => [...prev, chapter.id]);
                                } else {
                                  setSelectedChapterIds(prev => prev.filter(id => id !== chapter.id));
                                }
                              }}
                            />
                            <span className="text-sm text-[var(--secondary-text)] font-medium">Ch.{chapter.num}: {chapter.title}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl">
            <h3 className="text-xl font-bold mb-6 font-sans border-b border-white/5 pb-4">Settings</h3>
            <div className="mb-6">
              <label className="block text-sm text-[var(--secondary-text)] font-sans uppercase tracking-widest mb-4">
                Number of Questions
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[5, 10, 20].map(n => (
                  <button
                    key={n}
                    onClick={() => setNumQuestions(n)}
                    className={`py-2 rounded-xl font-bold font-sans transition-all ${numQuestions === n ? 'bg-gemini-blue text-white' : 'bg-white/5 text-[var(--secondary-text)] hover:bg-white/10'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            
            <button
              onClick={handleStart}
              disabled={loading || (selectedSectionIds.length === 0 && selectedChapterIds.length === 0)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 text-white font-bold font-sans py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  START SPRINT
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
