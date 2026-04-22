import React, { useState, useEffect } from 'react';
import { Maximize2, ExternalLink, Globe, Loader2 } from 'lucide-react';

interface WikiSummary {
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  originalimage?: {
    source: string;
    width: number;
    height: number;
  };
  extract?: string;
  displaytitle?: string;
  content_urls?: {
    desktop?: {
      page: string;
    };
  };
}

interface DynamicWikiImageProps {
  title: string;
  onExpand?: (url: string) => void;
}

export function DynamicWikiImage({ title, onExpand }: DynamicWikiImageProps) {
  const [data, setData] = useState<WikiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchWiki() {
      try {
        setLoading(true);
        const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
        if (!response.ok) throw new Error('Not found');
        const json = await response.json();
        setData(json);
      } catch (err) {
        console.error('Wiki fetch error:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    if (title) {
      fetchWiki();
    }
  }, [title]);

  if (loading) {
    return (
      <div className="w-full aspect-video bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center animate-pulse my-6">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 text-gemini-blue animate-spin" />
          <span className="text-[10px] uppercase tracking-widest text-gray-500">Injecting Neural Diagram...</span>
        </div>
      </div>
    );
  }

  if (error || (!data?.thumbnail && !data?.originalimage)) {
    return (
      <div className="w-full p-6 bg-red-500/5 rounded-3xl border border-red-500/10 my-6 flex flex-col items-center gap-3">
        <Globe className="w-8 h-8 text-red-500/30" />
        <div className="text-center">
          <div className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1">Diagram Search Failed</div>
          <div className="text-[10px] text-gray-500 font-sans italic">Resource "{title}" not found in Neural Index</div>
        </div>
      </div>
    );
  }

  const imageUrl = data.originalimage?.source || data.thumbnail?.source || '';
  const wikiUrl = data.content_urls?.desktop?.page;

  return (
    <div className="group/wiki my-6 relative max-w-2xl mx-auto">
      <div className="glass-card rounded-2xl overflow-hidden border border-white/5 hover:border-gemini-blue/30 transition-all shadow-xl">
        <div className="relative bg-black/40 min-h-[150px] flex items-center justify-center">
          <img 
            src={imageUrl} 
            alt={title}
            className="w-full h-auto max-h-[500px] object-contain group-hover/wiki:scale-[1.02] transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/wiki:opacity-100 transition-opacity" />
          
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end translate-y-4 opacity-0 group-hover/wiki:translate-y-0 group-hover/wiki:opacity-100 transition-all duration-300">
            <div className="flex-1 mr-4">
              <div className="text-[10px] font-bold text-gemini-cyan uppercase tracking-widest mb-1">Wiki Diagram</div>
              <h4 className="text-sm font-bold text-white truncate font-sans">{data.displaytitle || title}</h4>
            </div>
            
            <div className="flex gap-2">
              {onExpand && (
                <button 
                  onClick={() => onExpand(imageUrl)}
                  className="p-2 bg-white/10 backdrop-blur-md rounded-xl text-white hover:bg-white/20 transition-colors border border-white/10"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
              {wikiUrl && (
                <a 
                  href={wikiUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="p-2 bg-gemini-blue/20 backdrop-blur-md rounded-xl text-gemini-cyan hover:bg-gemini-blue/30 transition-colors border border-gemini-blue/20"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {data.extract && (
        <div className="mt-3 px-6 py-2 border-l-2 border-gemini-blue/30 italic">
          <p className="text-[11px] text-gray-500 font-sans leading-relaxed line-clamp-2">
            {data.extract}
          </p>
        </div>
      )}
    </div>
  );
}
