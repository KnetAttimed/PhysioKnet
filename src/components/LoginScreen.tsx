import { signInWithGoogle } from "../lib/firebase";
import { Brain, Sparkles, Stethoscope } from "lucide-react";
import { useState } from "react";

export function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gemini-cyan/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gemini-blue/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[2rem] p-8 shadow-2xl glass-card relative z-10 flex flex-col items-center border border-gray-200 dark:border-gray-800">
        <div className="w-20 h-20 bg-gradient-to-tr from-gemini-blue to-gemini-cyan rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-gemini-blue/20">
          <Brain className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-50 mb-2 text-center tracking-tight">
          KnetPhysio
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-8 font-medium">
          The cutting-edge medical training platform. Level up your physiology mastery.
        </p>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white font-bold rounded-2xl py-4 px-6 flex items-center justify-center gap-3 transition-colors shadow-lg disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-current border-t-transparent flex-shrink-0 animate-spin rounded-full" />
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          <span>Sign in with Google</span>
        </button>
        
        <div className="mt-8 flex gap-6 text-sm text-gray-400">
          <div className="flex flex-col items-center justify-center gap-1">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>AI Powered</span>
          </div>
          <div className="flex flex-col items-center justify-center gap-1">
            <Stethoscope className="w-5 h-5 text-red-500" />
            <span>Clinical Case</span>
          </div>
        </div>
      </div>
    </div>
  );
}
