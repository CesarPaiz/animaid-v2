import React, { useEffect, useState, useRef } from 'react';
import { Media } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { updateMediaProgress } from '../../services/anilistService';
import { getMangaChapterPagesFromProvider, MANGA_PROVIDERS, MangaPage, DebugLogEntry } from '../../services/contentService';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, CopyIcon } from '../icons';
import Spinner from '../Spinner';

interface ProviderStatus {
  status: 'loading' | 'success' | 'error';
  data?: MangaPage[] | null;
  log: DebugLogEntry[];
}

interface MangaReaderViewProps {
  media: Media;
  chapterNumber: number;
  onClose: () => void;
  onProgressUpdate: (updatedMedia: Media) => void;
  onChapterChange: (newChapter: number) => void;
}

// --- START: New Unified Process Inspector Components ---

const DebugStep: React.FC<{ entry: DebugLogEntry; index: number }> = ({ entry, index }) => {
    const [isOpen, setIsOpen] = useState(index === 0);
    const isError = !!entry.error;

    return (
        <div className="bg-slate-800 rounded-lg mb-2 overflow-hidden border border-slate-700">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex justify-between items-center p-3 text-left ${isError ? 'bg-red-500/20' : 'bg-slate-700/50'}`}
            >
                <span className="font-semibold text-sm text-slate-100">{entry.step}</span>
                <ChevronRightIcon className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-3 text-xs text-slate-300 space-y-3 border-t border-slate-700">
                    {entry.url && (
                        <div>
                            <strong className="text-slate-100 block mb-1">URL Solicitada:</strong>
                            <p className="font-mono bg-slate-900 p-2 rounded break-all">{entry.url}</p>
                        </div>
                    )}
                    {entry.extracted && (
                         <div>
                            <strong className="text-slate-100 block mb-1">Información Extraída:</strong>
                            <p className="bg-slate-900 p-2 rounded break-words">{entry.extracted}</p>
                        </div>
                    )}
                    {entry.response && (
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <strong className="text-slate-100">Respuesta Completa:</strong>
                                <button onClick={() => navigator.clipboard.writeText(JSON.stringify(entry.response, null, 2))} className="text-slate-400 hover:text-white p-1 rounded-full"><CopyIcon className="w-4 h-4" /></button>
                            </div>
                            <pre className="bg-slate-900 p-2 rounded text-xs max-h-64 overflow-auto font-mono whitespace-pre-wrap">
                                {JSON.stringify(entry.response, null, 2)}
                            </pre>
                        </div>
                    )}
                     {entry.error && (
                         <div>
                            <strong className="text-red-400 block mb-1">Error:</strong>
                            <p className="bg-red-900/50 text-red-300 p-2 rounded break-words font-mono">{entry.error}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ProcessInspectorModal: React.FC<{
  providerStatus: Map<string, ProviderStatus>;
  initialProvider: string;
  onClose: () => void;
}> = ({ providerStatus, initialProvider, onClose }) => {
  const [activeProvider, setActiveProvider] = useState(initialProvider);
  const providers = Array.from(providerStatus.keys());
  const activeLog = providerStatus.get(activeProvider)?.log || [];
  
  const getFullLogText = () => {
      let fullText = '';
      providers.forEach(providerName => {
          fullText += `--- PROVEEDOR: ${providerName.toUpperCase()} ---\n\n`;
          const log = providerStatus.get(providerName)?.log || [];
          log.forEach(entry => {
              let text = `> ${entry.step}`;
              if (entry.url) text += `\n  URL: ${entry.url}`;
              if (entry.extracted) text += `\n  Info: ${entry.extracted}`;
              if (entry.response) text += `\n  Respuesta: ${JSON.stringify(entry.response, null, 2)}`;
              if (entry.error) text += `\n  ERROR: ${entry.error}`;
              fullText += text + '\n\n';
          });
      });
      return fullText;
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">Inspector de Procesos</h3>
            <p className="text-sm text-slate-400">Analiza el flujo de peticiones por proveedor.</p>
          </div>
           <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700">
              <CloseIcon className="w-6 h-6"/>
           </button>
        </header>

        <div className="flex-shrink-0 border-b border-slate-700 overflow-x-auto scrollbar-hide">
          <div className="flex p-2 gap-2">
            {providers.map(provider => {
               const status = providerStatus.get(provider)?.status;
               let indicatorColor = 'bg-slate-500';
               if (status === 'success') indicatorColor = 'bg-green-500';
               if (status === 'error') indicatorColor = 'bg-red-500';

              return (
                <button
                  key={provider}
                  onClick={() => setActiveProvider(provider)}
                  className={`flex-shrink-0 px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${activeProvider === provider ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  <span className={`w-2 h-2 rounded-full ${indicatorColor}`}></span>
                  <span className="capitalize">{provider}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-grow">
          {activeLog.length > 0 ? (
              activeLog.map((entry, index) => <DebugStep key={`${activeProvider}-${index}`} entry={entry} index={index} />)
          ) : (
            <div className="text-center py-10 text-slate-500">
                <p>No hay registros para este proveedor.</p>
                <p className="text-xs">Esto puede ocurrir si la petición aún está en curso o falló inicialmente.</p>
            </div>
          )}
        </div>
        
        <footer className="p-3 border-t border-slate-700 flex-shrink-0">
             <button 
                onClick={() => navigator.clipboard.writeText(getFullLogText())}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg flex items-center justify-center gap-2"
             >
                <CopyIcon className="w-4 h-4"/>
                <span>Copiar Todos los Registros</span>
            </button>
        </footer>
      </div>
    </div>
  );
};

// --- END: New Unified Process Inspector Components ---

const ProviderCard: React.FC<{ 
    name: string; 
    statusInfo: ProviderStatus; 
    onSelect: () => void;
    onInspect: () => void;
}> = ({ name, statusInfo, onSelect, onInspect }) => {
    const isSuccess = statusInfo.status === 'success' && statusInfo.data && statusInfo.data.length > 0;
    
    let cardClasses = 'bg-slate-800/50 border-slate-700';
    if (isSuccess) cardClasses = 'bg-green-500/10 border-green-500/50';
    else if (statusInfo.status === 'error') cardClasses = 'bg-red-500/10 border-red-500/50';

    const lastError = statusInfo.status === 'error' ? statusInfo.log.find(l => l.error)?.error : null;

    return (
        <div className={`w-full p-3 border rounded-lg transition-colors ${cardClasses}`}>
            <div className="flex justify-between items-center gap-2">
                <button 
                    disabled={!isSuccess} 
                    onClick={onSelect}
                    className="flex-grow text-left disabled:cursor-not-allowed hover:enabled:bg-green-500/20 -m-3 p-3 rounded-lg transition-colors"
                >
                    <span className="font-bold capitalize">{name}</span>
                </button>

                <div className="flex items-center gap-2 flex-shrink-0">
                    {statusInfo.status === 'loading' && <div className="w-5 h-5 border-2 border-slate-500 border-t-indigo-400 rounded-full animate-spin"></div>}
                    {isSuccess && <span className="text-sm font-semibold text-green-400">Disponible</span>}
                    {statusInfo.status === 'error' && <span className="text-sm font-semibold text-red-400">Error</span>}
                    <button onClick={onInspect} className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded">
                        Inspeccionar
                    </button>
                </div>
            </div>
            {statusInfo.status === 'error' && lastError && (
                <p className="text-xs text-red-400/80 mt-1 break-words">{lastError}</p>
            )}
        </div>
    );
};


const MangaReaderView: React.FC<MangaReaderViewProps> = ({ media, chapterNumber, onClose, onProgressUpdate, onChapterChange }) => {
  const { token } = useAuth();
  
  const [providerStatus, setProviderStatus] = useState<Map<string, ProviderStatus>>(new Map());
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  const [inspectorProvider, setInspectorProvider] = useState<string | null>(null);
  
  const [isSyncing, setIsSyncing] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const totalChapters = media.chapters || 0;

  const pages = activeProvider ? providerStatus.get(activeProvider)?.data || [] : [];
  
  useEffect(() => {
    setIsSyncing(true);
    const syncProgress = async () => {
      if (token && chapterNumber > (media.userProgress?.progress || 0)) {
        try {
          await updateMediaProgress(media.id, chapterNumber, token);
          const updatedMedia = { ...media, userProgress: { ...(media.userProgress || {score: 0}), progress: chapterNumber } };
          onProgressUpdate(updatedMedia);
        } catch (err) { console.error("Failed to sync progress:", err); }
      }
      setIsSyncing(false);
    };
    syncProgress();
  }, [media.id, chapterNumber, token, onProgressUpdate]);

  useEffect(() => {
    setProviderStatus(new Map());
    setActiveProvider(null);
    setCurrentPage(1);
    if(scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;

    let title = media.title.romaji || media.title.english || '';
    title = title.toLowerCase().replace(/\s+/g, '-');
    MANGA_PROVIDERS.forEach(provider => {
        setProviderStatus(prev => new Map(prev).set(provider, { status: 'loading', log: [] }));
        getMangaChapterPagesFromProvider(provider, title, chapterNumber)
            .then(result => {
                setProviderStatus(prev => new Map(prev).set(provider, { 
                    status: result.data ? 'success' : 'error', 
                    data: result.data, 
                    log: result.log 
                }));
            });
    });
  }, [media.title.english, media.title.romaji, chapterNumber]);
  
  useEffect(() => {
      if (!pages.length || !scrollContainerRef.current) return;

      const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const pageNum = parseInt(entry.target.getAttribute('data-page') || '0', 10);
                    if (pageNum) setCurrentPage(pageNum);
                }
            });
        }, { root: scrollContainerRef.current, threshold: 0.5 });

      pageRefs.current = Array(pages.length).fill(null);
      const currentRefs = pageRefs.current;
      currentRefs.forEach(ref => { if (ref) observer.observe(ref); });
      return () => { currentRefs.forEach(ref => { if (ref) observer.unobserve(ref); }); };
  }, [pages]);

  const handleProviderSelect = (provider: string) => {
      if(providerStatus.get(provider)?.status === 'success') {
          setActiveProvider(provider);
      }
  };
  
  const ChapterNav = () => (
    <div className={`flex items-center justify-between w-full max-w-lg mx-auto`}>
      <button onClick={() => onChapterChange(chapterNumber - 1)} disabled={chapterNumber <= 1} className="flex items-center gap-2 bg-slate-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          <ChevronLeftIcon className="w-5 h-5" />
          <span>Anterior</span>
      </button>
      <div className="text-center">
          <span className="font-semibold">Cap. {chapterNumber}</span>
          {activeProvider && pages.length > 0 && <p className="text-xs text-slate-400">Pág. {currentPage} / {pages.length}</p>}
      </div>
      <button onClick={() => onChapterChange(chapterNumber + 1)} disabled={totalChapters > 0 && chapterNumber >= totalChapters} className="flex items-center gap-2 bg-slate-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
          <span>Siguiente</span>
          <ChevronRightIcon className="w-5 h-5" />
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col text-white animate-fade-in">
        {inspectorProvider && (
            <ProcessInspectorModal 
                providerStatus={providerStatus}
                initialProvider={inspectorProvider}
                onClose={() => setInspectorProvider(null)}
            />
        )}
        
        <header className="p-3 bg-slate-900 flex items-center z-10 flex-shrink-0 border-b border-slate-800">
            <button onClick={onClose} className="p-2 rounded-full bg-slate-800" aria-label="Volver">
                <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <div className="text-center flex-1 mx-2 min-w-0">
                <h1 className="text-base font-bold truncate">{media.title.english || media.title.romaji}</h1>
                <h2 className="text-sm text-slate-400">Capítulo {chapterNumber}</h2>
            </div>
             {activeProvider ? (
                <button onClick={() => setActiveProvider(null)} className="text-sm bg-slate-800 px-3 py-2 rounded-lg capitalize hover:bg-slate-700">
                    {activeProvider} (Cambiar)
                </button>
            ) : <div className="w-24 h-10 flex-shrink-0" /> /* Spacer */}
        </header>

        <main ref={scrollContainerRef} className="flex-grow w-full overflow-y-auto bg-black">
            {!activeProvider ? (
                <div className="w-full max-w-2xl mx-auto p-4 space-y-3">
                    <h3 className="text-lg font-bold text-center mb-4">Selecciona un proveedor</h3>
                    {MANGA_PROVIDERS.map(provider => {
                        const statusInfo = providerStatus.get(provider) || { status: 'loading', log:[] };
                        return <ProviderCard 
                                    key={provider} 
                                    name={provider} 
                                    statusInfo={statusInfo} 
                                    onSelect={() => handleProviderSelect(provider)}
                                    onInspect={() => setInspectorProvider(provider)}
                                />;
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center">
                    {pages.map((page, index) => (
                        <img key={page.page} ref={el => { pageRefs.current[index] = el; }} data-page={page.page} src={page.img} alt={`Page ${page.page}`} className="max-w-full h-auto mb-1" loading="lazy" />
                    ))}
                </div>
            )}
        </main>
        
        <footer className="p-2 bg-slate-900 z-10 flex-shrink-0 border-t border-slate-800">
             <ChapterNav />
        </footer>
    </div>
  );
};

export default MangaReaderView;