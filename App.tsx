import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Film, 
  ChevronRight, 
  AlertCircle, 
  Loader2, 
  Clapperboard,
  History,
  Undo2,
  Play,
  X,
  Maximize2,
  ArrowUp
} from 'lucide-react';
import { ApiKeySelector } from './components/ApiKeySelector';
import { VideoPlayer } from './components/VideoPlayer';
import { generateInitialVideo, extendVideo } from './services/veoService';
import { VideoHistoryItem, GenerationStatus, AspectRatio } from './types';

function App() {
  // Skip API key selector when running locally with VITE_API_KEY set
  const [hasApiKey, setHasApiKey] = useState(!!import.meta.env.VITE_API_KEY);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  
  // History management
  const [history, setHistory] = useState<VideoHistoryItem[]>([]);
  
  // Sequence Playback State
  const [isSequencePlaying, setIsSequencePlaying] = useState(false);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  
  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const sequenceVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, status]);

  // Effect to handle sequence playback logic
  useEffect(() => {
    if (isSequencePlaying && sequenceVideoRef.current) {
      sequenceVideoRef.current.src = history[sequenceIndex].url;
      sequenceVideoRef.current.play().catch(e => console.error("Playback failed", e));
    }
  }, [sequenceIndex, isSequencePlaying, history]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    const isExtending = history.length > 0;
    
    try {
      setError(null);
      setStatus(isExtending ? GenerationStatus.EXTENDING : GenerationStatus.GENERATING);
      
      let result;
      if (isExtending) {
        const lastVideo = history[history.length - 1];
        result = await extendVideo(lastVideo.veoAsset, prompt, aspectRatio);
      } else {
        result = await generateInitialVideo(prompt, aspectRatio);
      }

      const newItem: VideoHistoryItem = {
        id: crypto.randomUUID(),
        url: result.blobUrl,
        prompt: prompt,
        timestamp: Date.now(),
        veoAsset: result.videoAsset,
        isExtension: isExtending
      };

      setHistory(prev => [...prev, newItem]);
      setPrompt(''); 
      setStatus(GenerationStatus.IDLE);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      setStatus(GenerationStatus.ERROR);
    }
  };

  const handleDownload = (item: VideoHistoryItem) => {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = `veo-video-${item.id}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = () => {
    if (confirm("Start a new project? This will clear current video context.")) {
      setHistory([]);
      setPrompt('');
      setError(null);
      setStatus(GenerationStatus.IDLE);
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    if (confirm("Remove the last generated clip? You can try generating it again with a refined prompt.")) {
      setHistory(prev => prev.slice(0, -1));
    }
  };

  const startSequencePlayback = () => {
    if (history.length === 0) return;
    setSequenceIndex(0);
    setIsSequencePlaying(true);
  };

  const handleSequenceEnded = () => {
    if (sequenceIndex < history.length - 1) {
      setSequenceIndex(prev => prev + 1);
    } else {
      setIsSequencePlaying(false);
      setSequenceIndex(0);
    }
  };

  if (!hasApiKey) {
    return <ApiKeySelector onKeySelected={() => setHasApiKey(true)} />;
  }

  const currentLastVideo = history.length > 0 ? history[history.length - 1] : null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-blue-500/30">
      
      {/* Sequence Player Overlay */}
      {isSequencePlaying && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
          <div className="absolute top-6 right-6 z-10">
            <button 
              onClick={() => setIsSequencePlaying(false)}
              className="p-2 bg-neutral-800/80 hover:bg-neutral-700 text-white rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="relative w-full h-full max-w-5xl max-h-screen flex items-center justify-center p-4">
             <video
               ref={sequenceVideoRef}
               className="max-w-full max-h-full shadow-2xl rounded-lg"
               onEnded={handleSequenceEnded}
               controls={false}
               autoPlay
             />
             <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-sm font-mono text-white/80">
               Clip {sequenceIndex + 1} / {history.length}
             </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-white/5 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Film className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">Veo Studio</span>
        </div>
        <div className="flex items-center gap-3">
          {history.length > 0 && (
            <>
              <button 
                onClick={startSequencePlayback}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 border border-white/5"
              >
                <Play className="w-3 h-3 fill-current" />
                Play Sequence
              </button>
              <div className="h-4 w-px bg-white/10 mx-1" />
              <button 
                onClick={handleReset}
                className="text-xs font-medium text-neutral-500 hover:text-white transition-colors flex items-center gap-1"
              >
                <Clapperboard className="w-3 h-3" />
                New Project
              </button>
            </>
          )}
        </div>
      </header>

      <main className="pt-24 pb-48 px-4 max-w-5xl mx-auto w-full">
        
        {/* Intro / Empty State */}
        {history.length === 0 && status === GenerationStatus.IDLE && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
            <div className="w-20 h-20 bg-neutral-900 rounded-full flex items-center justify-center mb-6 ring-1 ring-white/10">
              <Sparkles className="w-10 h-10 text-blue-500" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Continuous Video Gen</h1>
            <p className="max-w-md text-neutral-400 mb-8">
              1. Generate a base video.<br/>
              2. Type what happens next to extend it.<br/>
              3. Repeat to build a movie.
            </p>
          </div>
        )}

        {/* Video History Timeline */}
        <div className="space-y-12">
          {history.map((item, index) => (
            <div key={item.id} className="relative pl-8 md:pl-0 fade-in-up">
              
              {/* Connector Line (Desktop) */}
              {index < history.length - 1 && (
                 <div className="hidden md:block absolute left-1/2 top-full h-12 w-px bg-gradient-to-b from-blue-500/50 to-transparent -ml-[0.5px] z-0" />
              )}
              
              {/* Step Indicator */}
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="hidden md:flex flex-col items-end w-32 pt-4 flex-shrink-0">
                  <span className="text-xs font-mono text-blue-400 mb-1">
                    {item.isExtension ? 'EXTENSION' : 'BASE CLIP'}
                  </span>
                  <span className="text-xs text-neutral-600">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                  </span>
                  {index === history.length - 1 && index > 0 && (
                     <button 
                       onClick={handleUndo}
                       className="mt-4 text-xs flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors opacity-60 hover:opacity-100"
                       title="Undo this step"
                     >
                       <Undo2 className="w-3 h-3" />
                       Undo
                     </button>
                  )}
                </div>

                <div className="flex-1 w-full relative z-10">
                   {/* Mobile Label */}
                   <div className="md:hidden flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-neutral-800 rounded text-neutral-400">
                        {item.isExtension ? `PART ${index + 1}` : 'START'}
                      </span>
                      {index === history.length - 1 && index > 0 && (
                        <button onClick={handleUndo} className="text-red-400 text-xs flex items-center gap-1">
                          <Undo2 className="w-3 h-3" /> Undo
                        </button>
                      )}
                   </div>

                   <div className="bg-neutral-900 border border-white/5 rounded-2xl p-1 shadow-2xl overflow-hidden group/card transition-transform hover:scale-[1.01]">
                     <VideoPlayer 
                       url={item.url} 
                       onDownload={() => handleDownload(item)}
                     />
                     <div className="p-4 flex justify-between items-start gap-4">
                       <p className="text-sm text-neutral-300 leading-relaxed">
                         <span className="text-neutral-500 font-mono text-xs mr-2 uppercase tracking-wide">Prompt</span>
                         {item.prompt}
                       </p>
                       <button 
                         onClick={() => {
                           setSequenceIndex(index);
                           setIsSequencePlaying(true);
                         }}
                         className="hidden md:flex p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-400 hover:text-white transition-colors"
                         title="Play from here"
                       >
                         <Maximize2 className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                </div>
              </div>
            </div>
          ))}

          {/* Loading State Placeholder */}
          {(status === GenerationStatus.GENERATING || status === GenerationStatus.EXTENDING) && (
             <div className="flex flex-col md:flex-row gap-6 items-start opacity-70" ref={scrollRef}>
                <div className="hidden md:block w-32" />
                <div className="flex-1 w-full bg-neutral-900/50 border border-white/5 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px] border-dashed animate-pulse">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                  <h3 className="text-lg font-medium text-white mb-1">
                    {status === GenerationStatus.EXTENDING ? 'Extending Scene...' : 'Generating Scene...'}
                  </h3>
                  <p className="text-sm text-neutral-500 max-w-xs text-center">
                    Dreaming up the next 8 seconds...
                  </p>
                </div>
             </div>
          )}
          
          <div ref={scrollRef} />
        </div>
      </main>

      {/* Input Area (Sticky Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-950 border-t border-white/5 p-4 md:p-6 pb-8">
        <div className="max-w-3xl mx-auto relative">
          
          {error && (
            <div className="absolute -top-16 left-0 right-0 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 text-sm animate-shake">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Context Preview (New) */}
          {currentLastVideo && status === GenerationStatus.IDLE && (
            <div className="absolute -top-24 left-0 flex items-center gap-3 bg-neutral-900/90 border border-white/10 backdrop-blur rounded-lg p-2 pr-4 shadow-lg animate-fade-in-up">
              <div className="w-20 h-12 bg-black rounded overflow-hidden relative">
                 <video src={currentLastVideo.url} className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-black/20" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-blue-400">Context</span>
                <span className="text-xs text-white">Extending this clip</span>
              </div>
              <ArrowUp className="w-4 h-4 text-neutral-500" />
            </div>
          )}

          <div className="relative flex items-end gap-2 bg-neutral-900 border border-neutral-800 rounded-xl p-2 shadow-xl focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
            
            {/* Aspect Ratio Toggle (Only for initial generation) */}
            {history.length === 0 && (
              <div className="hidden md:flex flex-col gap-1 mr-2 p-1 bg-neutral-950 rounded-lg border border-white/5">
                 <button 
                  onClick={() => setAspectRatio('16:9')}
                  className={`p-1.5 rounded transition-all ${aspectRatio === '16:9' ? 'bg-neutral-800 text-white' : 'text-neutral-600 hover:text-neutral-400'}`}
                  title="Landscape 16:9"
                 >
                   <div className="w-5 h-3 border-2 border-current rounded-[1px]" />
                 </button>
                 <button 
                  onClick={() => setAspectRatio('9:16')}
                  className={`p-1.5 rounded transition-all ${aspectRatio === '9:16' ? 'bg-neutral-800 text-white' : 'text-neutral-600 hover:text-neutral-400'}`}
                  title="Portrait 9:16"
                 >
                   <div className="w-3 h-5 border-2 border-current rounded-[1px]" />
                 </button>
              </div>
            )}

            <div className="flex-1 min-w-0">
               {history.length > 0 && (
                 <div className="flex items-center gap-2 mb-2 px-2">
                   <span className="text-xs font-semibold text-blue-400 flex items-center gap-1 uppercase tracking-wider">
                     <History className="w-3 h-3" />
                     {history.length === 0 ? "New Scene" : `Extending Part ${history.length}`}
                   </span>
                 </div>
               )}
               <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={history.length === 0 ? "Describe the video you want to create..." : "Describe what happens next..."}
                className="w-full bg-transparent border-0 text-white placeholder-neutral-600 focus:ring-0 resize-none min-h-[48px] max-h-[120px] py-3 px-3 text-base"
                rows={1}
                onKeyDown={(e) => {
                  if(e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if(status === GenerationStatus.IDLE) handleGenerate();
                  }
                }}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={status !== GenerationStatus.IDLE || !prompt.trim()}
              className={`
                h-12 px-6 rounded-lg font-medium flex items-center gap-2 transition-all flex-shrink-0
                ${!prompt.trim() || status !== GenerationStatus.IDLE
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                }
              `}
            >
              {status !== GenerationStatus.IDLE ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {history.length > 0 ? 'Extend' : 'Generate'}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
          
          <div className="mt-2 text-center text-xs text-neutral-600">
             {history.length === 0 ? 'Starts a new video sequence.' : 'Extends the previous clip by ~8 seconds.'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;