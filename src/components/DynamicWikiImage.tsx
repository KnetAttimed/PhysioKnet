import React, { useState, useEffect, useCallback } from 'react';
import { Maximize2, ExternalLink, RefreshCw, Loader2, Search, Info, Globe } from 'lucide-react';

interface MediaResult {
  title: string;
  url: string;
  description?: string;
}

interface DynamicWikiImageProps {
  title: string;
  onExpand?: (url: string) => void;
}

export function DynamicWikiImage({ title, onExpand }: DynamicWikiImageProps) {
  const [images, setImages] = useState<MediaResult[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const cleanTitle = title.replace(/_/g, ' ');

  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      
      const words = cleanTitle.split(' ');
      const searchTerms = [
        `${cleanTitle} physiology diagram`,
        `${cleanTitle} medical illustration`,
        `${cleanTitle} anatomy`,
        `${cleanTitle}`
      ];

      let foundImages: MediaResult[] = [];

      // Stage 1: Wikimedia Commons File Search (Specific)
      for (const term of searchTerms) {
        if (!term.trim() || term.length < 3) continue;
        const searchQuery = encodeURIComponent(term);
        const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=filetype:bitmap|drawing ${searchQuery}&gsrlimit=5&prop=imageinfo&iiprop=url&format=json&origin=*`;
        
        try {
          const response = await fetch(url);
          if (!response.ok) continue;
          const json = await response.json();
          if (json.query?.pages) {
            const results = Object.values(json.query.pages) as any[];
            const images = results
              .filter(p => p.imageinfo?.[0])
              .map(p => ({
                title: p.title.replace('File:', '').replace(/\.[^/.]+$/, "").replace(/_/g, " "),
                url: p.imageinfo[0].url,
              }));
            if (images.length > 0) {
              foundImages = [...foundImages, ...images];
            }
          }
        } catch (e) {}
      }

      // Stage 2: Wikipedia Page Image Search (Fallback & Accuracy)
      // This searches for Wikipedia articles and grabs their primary images
      if (foundImages.length < 2) {
        const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&pithumbsize=1000&generator=search&gsrsearch=${encodeURIComponent(cleanTitle)}&gsrlimit=5&origin=*`;
        try {
          const response = await fetch(wikiUrl);
          const json = await response.json();
          if (json.query?.pages) {
            const results = Object.values(json.query.pages) as any[];
            const wikiImages = results
              .filter(p => p.thumbnail?.source)
              .map(p => ({
                title: p.title,
                url: p.thumbnail.source,
              }));
            foundImages = [...foundImages, ...wikiImages];
          }
        } catch (e) {}
      }

      if (foundImages.length === 0) throw new Error('Empty pool');
      
      // Deduplicate by URL
      const uniqueImages = Array.from(new Map(foundImages.map(img => [img.url, img])).values());
      
      setImages(uniqueImages);
      setCurrentIndex(Math.floor(Math.random() * uniqueImages.length));
    } catch (err) {
      console.error('Neural Image Search Error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [cleanTitle]);

  useEffect(() => {
    if (title) {
      fetchImages();
    }
  }, [title, fetchImages]);

  const rotateImage = () => {
    if (images.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }
  };

  const getExternalSearchUrl = (query: string) => {
    return `https://www.google.com/search?q=${encodeURIComponent(query + " clinical physiology anatomy diagram radiopaedia")}&tbm=isch`;
  };

  if (loading) {
    return (
      <div className="w-full aspect-video bg-[var(--card-bg)] rounded-3xl border border-[var(--card-border)] flex items-center justify-center animate-pulse my-6">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 text-gemini-blue animate-spin" />
          <span className="text-[10px] uppercase tracking-widest text-[var(--secondary-text)]">Connecting Neural Search Nodes...</span>
        </div>
      </div>
    );
  }

  if (error || images.length === 0) {
    // Generate a diverse, keyword-based fallback using LoremFlickr (more variety than static ID)
    const fallbackUrl = `https://loremflickr.com/800/600/medical,biology,physiology,${encodeURIComponent(cleanTitle.split(' ')[0])}/all`;
    
    return (
      <div className="group/wiki my-6 relative max-w-2xl mx-auto">
        <div className="glass-card rounded-2xl overflow-hidden border-2 border-dashed border-amber-500/20 hover:border-amber-500/50 transition-all bg-[var(--app-bg)]/40">
          <div className="relative min-h-[300px] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
              <Search className="w-8 h-8 text-amber-500" />
            </div>
            <h4 className="text-xl font-bold text-[var(--app-text)] mb-2 font-sans">Research Node Required</h4>
            <p className="text-[var(--secondary-text)] text-sm mb-8 max-w-sm mx-auto font-sans leading-relaxed">
              Specific mechanistic diagram for <span className="text-amber-400 font-bold">"{cleanTitle}"</span> was not found in our local neural pool.
            </p>
            
            <a 
              href={getExternalSearchUrl(cleanTitle)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-2xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 group/btn"
            >
              <Globe className="w-5 h-5" />
              <span>Launch Google Image Search</span>
              <ExternalLink className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </a>
            
            <div className="mt-8 pt-8 border-t border-[var(--card-border)] w-full">
               <div className="text-[10px] text-[var(--secondary-text)] uppercase tracking-widest mb-4">Neural Visualization Logic</div>
               <div className="flex justify-center gap-4">
                  <div className="px-3 py-1 bg-[var(--card-bg)] rounded-full text-[10px] text-[var(--secondary-text)] border border-[var(--card-border)]">Multi-stage Search: FAILED</div>
                  <div className="px-3 py-1 bg-[var(--card-bg)] rounded-full text-[10px] text-[var(--secondary-text)] border border-[var(--card-border)]">Recommendation: External Study</div>
               </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <div className="group/wiki my-6 relative max-w-2xl mx-auto">
      <div className="glass-card rounded-2xl overflow-hidden border border-[var(--card-border)] hover:border-gemini-blue/30 transition-all shadow-xl">
        <div className="relative bg-white min-h-[150px] flex items-center justify-center p-4">
          <img 
            src={currentImage.url} 
            alt={cleanTitle}
            className="w-full h-auto max-h-[500px] object-contain group-hover/wiki:scale-[1.02] transition-transform duration-700"
            referrerPolicy="no-referrer"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/wiki:opacity-100 transition-opacity" />
          
          <div className="absolute top-4 right-4 z-10 opacity-0 group-hover/wiki:opacity-100 transition-opacity">
             <div className="flex gap-2">
                {images.length > 1 && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); rotateImage(); }}
                    className="p-2 bg-black/60 backdrop-blur-md rounded-xl text-white hover:bg-gemini-blue/80 transition-all border border-white/20 flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-[8px] font-bold uppercase tracking-tighter">Shuffle ({currentIndex + 1}/{images.length})</span>
                  </button>
                )}
             </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end translate-y-4 opacity-0 group-hover/wiki:translate-y-0 group-hover/wiki:opacity-100 transition-all duration-300">
            <div className="flex-1 mr-4">
              <div className="text-[10px] font-bold text-gemini-cyan uppercase tracking-widest mb-1">Neural Pool Analysis</div>
              <h4 className="text-sm font-bold text-white truncate font-sans max-w-[250px]">{currentImage.title}</h4>
            </div>
            
            <div className="flex gap-2">
              <a 
                href={getExternalSearchUrl(cleanTitle)}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-white/10 backdrop-blur-md rounded-xl text-white hover:bg-white/20 transition-colors border border-white/10"
                title="Search more diagrams"
              >
                <Search className="w-4 h-4" />
              </a>
              {onExpand && (
                <button 
                  onClick={() => onExpand(currentImage.url)}
                  className="p-2 bg-white/10 backdrop-blur-md rounded-xl text-white hover:bg-white/20 transition-colors border border-white/10"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2 text-[9px] text-[var(--secondary-text)] font-mono px-2 flex items-center justify-between">
        <span>Image Node {currentIndex + 1} of {images.length} sourced from Open Atlas</span>
        <button onClick={rotateImage} className="text-gemini-cyan hover:underline">Incorrect image? Shuffle nodes</button>
      </div>
    </div>
  );
}
