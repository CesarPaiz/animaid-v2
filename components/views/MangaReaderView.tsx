import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Media, MediaListStatus, MediaStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getMangaChapterPagesFromProvider, MANGA_PROVIDERS, MangaPage, DebugLogEntry } from '../../services/contentService';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, CopyIcon, Cog6ToothIcon } from '../icons';
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

const DebugStep: React.FC<{ entry: DebugLogEntry; index: number }> = ({ entry, index }) => {
    const [isOpen, setIsOpen] = useState(index === 0);
    const isError = !!entry.error;
    return (
        <div className="bg-gray-800 rounded-lg mb-2 overflow-hidden border border-gray-700">
            <button onClick={() => setIsOpen(!isOpen)} className={`w-full flex justify-between items-center p-3 text-left ${isError ? 'bg-red-500/20' : 'bg-gray-700/50'}`}>
                <span className="font-semibold text-sm text-gray-100">{entry.step}</span>
                <ChevronRightIcon className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-3 text-xs text-gray-300 space-y-3 border-t border-gray-700">
                    {entry.url && (<div><strong className="text-gray-100 block mb-1">URL:</strong><p className="font-mono bg-gray-900 p-2 rounded break-all">{entry.url}</p></div>)}
                    {entry.extracted && (<div><strong className="text-gray-100 block mb-1">Extraído:</strong><p className="bg-gray-900 p-2 rounded break-words">{entry.extracted}</p></div>)}
                    {entry.response && (<div><div className="flex justify-between items-center mb-1"><strong className="text-gray-100">Respuesta:</strong><button onClick={() => navigator.clipboard.writeText(JSON.stringify(entry.response, null, 2))} className="text-gray-400 hover:text-white p-1"><CopyIcon className="w-4 h-4" /></button></div><pre className="bg-gray-900 p-2 rounded text-xs max-h-64 overflow-auto">{JSON.stringify(entry.response, null, 2)}</pre></div>)}
                    {entry.error && (<div><strong className="text-red-400 block mb-1">Error:</strong><p className="bg-red-900/50 text-red-300 p-2 rounded break-words font-mono">{entry.error}</p></div>)}
                </div>
            )}
        </div>
    );
};

const ProcessInspectorModal: React.FC<{ providerStatus: Map<string, ProviderStatus>; initialProvider: string; onClose: () => void; }> = ({ providerStatus, initialProvider, onClose }) => {
    const [activeProvider, setActiveProvider] = useState(initialProvider);
    const providers = Array.from(providerStatus.keys());
    const activeLog = providerStatus.get(activeProvider)?.log || [];
    return (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-gray-900/95 border border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0"><h3 className="text-lg font-bold text-white">Inspector de Procesos</h3><button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700"><CloseIcon className="w-6 h-6"/></button></header>
                <div className="flex-shrink-0 border-b border-gray-700 overflow-x-auto scrollbar-hide"><div className="flex p-2 gap-2">{providers.map(p => (<button key={p} onClick={() => setActiveProvider(p)} className={`flex-shrink-0 px-3 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${activeProvider === p ? 'bg-indigo-600' : 'bg-gray-800 hover:bg-gray-700'}`}><span className={`w-2 h-2 rounded-full ${providerStatus.get(p)?.status === 'success' ? 'bg-green-500' : providerStatus.get(p)?.status === 'error' ? 'bg-red-500' : 'bg-gray-500'}`}></span><span className="capitalize">{p}</span></button>))}</div></div>
                <div className="p-4 overflow-y-auto flex-grow">{activeLog.length > 0 ? activeLog.map((e, i) => <DebugStep key={`${activeProvider}-${i}`} entry={e} index={i} />) : <div className="text-center py-10 text-gray-500"><p>No hay registros.</p></div>}</div>
            </div>
        </div>
    );
};

const ProviderCard: React.FC<{ name: string; statusInfo: ProviderStatus; showInspect: boolean; onSelect: () => void; onInspect: () => void; }> = ({ name, statusInfo, showInspect, onSelect, onInspect }) => {
    const isSuccess = statusInfo.status === 'success' && statusInfo.data && statusInfo.data.length > 0;
    let cardClasses = 'bg-gray-900 border-gray-700/80';
    if (isSuccess) cardClasses = 'bg-green-500/10 border-green-500/50';
    else if (statusInfo.status === 'error') cardClasses = 'bg-red-500/10 border-red-500/50';
    const lastError = statusInfo.status === 'error' ? statusInfo.log.find(l => l.error)?.error : null;
    return (
        <div className={`w-full p-3 border rounded-lg transition-all ${cardClasses}`}>
            <div className="flex justify-between items-center gap-2">
                <div className="flex-grow"><span className="font-bold capitalize">{name}</span>{statusInfo.status === 'error' && lastError && (<p className="text-xs text-red-400/80 mt-1">{lastError}</p>)}</div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    {statusInfo.status === 'loading' && <div className="w-5 h-5 border-2 border-gray-500 border-t-indigo-400 rounded-full animate-spin"></div>}
                    {showInspect && <button onClick={onInspect} className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600"><Cog6ToothIcon className="w-4 h-4" /></button>}
                    <button disabled={!isSuccess} onClick={onSelect} className="font-semibold text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-md disabled:bg-gray-700 disabled:text-gray-500 hover:enabled:bg-indigo-500">
                        {isSuccess ? 'Leer' : (statusInfo.status === 'error' ? 'Error' : '...')}</button>
                </div>
            </div>
        </div>
    );
};

const MangaReaderView: React.FC<MangaReaderViewProps> = ({ media, chapterNumber, onClose, onProgressUpdate, onChapterChange }) => {
  const { user, upsertMediaEntry, isDebugMode } = useAuth();
  const [providerStatus, setProviderStatus] = useState<Map<string, ProviderStatus>>(new Map());
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [inspectorProvider, setInspectorProvider] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showControls, setShowControls] = useState(true);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const totalChapters = media.chapters || 0;
  const pages = activeProvider ? providerStatus.get(activeProvider)?.data || [] : [];
  
  const markChapterAsRead = useCallback(async (chapterToMark: number) => {
    if (!user || chapterToMark <= (media.userProgress?.progress || 0)) {
        return;
    }
    const totalChapters = media.chapters || 0;
    let newStatus = media.userProgress?.status || MediaListStatus.CURRENT;

    const statusesThatBecomeCurrent: MediaListStatus[] = [MediaListStatus.PLANNING, MediaListStatus.PAUSED, MediaListStatus.DROPPED];
    if (statusesThatBecomeCurrent.includes(newStatus)) {
        newStatus = MediaListStatus.CURRENT;
    } else if (newStatus === MediaListStatus.COMPLETED) {
        newStatus = MediaListStatus.REPEATING;
    }

    if (totalChapters > 0 && chapterToMark >= totalChapters && media.status === MediaStatus.FINISHED) {
        newStatus = MediaListStatus.COMPLETED;
    }
    
    try {
        setIsSyncing(true);
        const updatedEntry = await upsertMediaEntry({
            media_id: media.id, progress: chapterToMark, status: newStatus, media_type: 'MANGA'
        });
        if (updatedEntry) {
            const updatedMedia = { ...media, userProgress: { 
                progress: updatedEntry.progress, score: updatedEntry.score, status: updatedEntry.status 
            }};
            onProgressUpdate(updatedMedia);
        }
    } catch (err) { console.error("Fallo al sincronizar progreso de manga:", err); } 
    finally { setIsSyncing(false); }
  }, [user, media, upsertMediaEntry, onProgressUpdate]);
  
  const handleNextChapter = async () => {
    await markChapterAsRead(chapterNumber);
    onChapterChange(chapterNumber + 1);
  };
  
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
            .then(result => setProviderStatus(prev => new Map(prev).set(provider, { 
                status: result.data && result.data.length > 0 ? 'success' : 'error', data: result.data, log: result.log 
            })));
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
      pageRefs.current.forEach((_, i) => {
          const el = document.getElementById(`page-${i+1}`);
          if (el) {
              pageRefs.current[i] = el as HTMLDivElement;
              observer.observe(el);
          }
      });
      return () => { pageRefs.current.forEach(ref => { if (ref) observer.unobserve(ref); }); };
  }, [pages.length]);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col text-white animate-fade-in">
        {inspectorProvider && (<ProcessInspectorModal providerStatus={providerStatus} initialProvider={inspectorProvider} onClose={() => setInspectorProvider(null)}/>)}
        
        <header className={`p-3 bg-gray-950/80 backdrop-blur-md flex items-center z-10 flex-shrink-0 border-b border-gray-800/80 absolute top-0 left-0 right-0 transition-transform duration-300 ${showControls ? 'translate-y-0' : '-translate-y-full'}`}>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700/60"><ArrowLeftIcon className="w-6 h-6" /></button>
            <div className="text-center flex-1 mx-2 min-w-0">
                <h1 className="text-base font-bold truncate">{media.title.english || media.title.romaji}</h1>
                {activeProvider ? <h2 className="text-sm text-gray-300">Cap. {chapterNumber} (p. {currentPage}/{pages.length})</h2> : <h2 className="text-sm text-gray-300">Cap. {chapterNumber}</h2>}
            </div>
             {activeProvider ? (<button onClick={() => setActiveProvider(null)} className="text-sm bg-gray-800 px-3 py-2 rounded-lg capitalize hover:bg-gray-700">Cambiar</button>) : <div className="w-24 h-10"/>}
        </header>

        <main ref={scrollContainerRef} className="flex-grow w-full overflow-y-auto bg-black" onClick={() => setShowControls(c => !c)}>
            {!activeProvider ? (
                <div className="w-full max-w-md mx-auto p-4 space-y-3 mt-20">
                    <h3 className="text-lg font-bold text-center mb-4">Selecciona un proveedor</h3>
                    {MANGA_PROVIDERS.map(p => (<ProviderCard key={p} name={p} statusInfo={providerStatus.get(p) || { status: 'loading', log:[] }} showInspect={isDebugMode} onSelect={() => setActiveProvider(p)} onInspect={() => setInspectorProvider(p)} />))}
                </div>
            ) : (
                <div className="flex flex-col items-center pt-24 pb-28">
                    {pages.length > 0 ? (
                      pages.map((page, index) => (<div id={`page-${page.page}`} key={page.page} data-page={page.page} className="w-full max-w-4xl"><img src={page.img} alt={`Page ${page.page}`} className="w-full h-auto" loading="lazy" /></div>))
                    ) : (
                      <div className="pt-10"><Spinner /></div>
                    )}
                </div>
            )}
        </main>
        
        <footer className={`p-2 bg-gray-950/80 backdrop-blur-md z-10 flex-shrink-0 border-t border-gray-800/80 absolute bottom-0 left-0 right-0 transition-transform duration-300 ${showControls ? 'translate-y-0' : 'translate-y-full'}`}>
             <div className="flex items-center justify-between w-full max-w-lg mx-auto">
                <button onClick={() => onChapterChange(chapterNumber - 1)} disabled={chapterNumber <= 1} className="flex items-center gap-2 bg-gray-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
                    <ChevronLeftIcon className="w-5 h-5" /><span>Anterior</span>
                </button>
                 {isSyncing && <p className="text-xs text-indigo-400 animate-pulse font-semibold">Guardando...</p>}
                <button onClick={handleNextChapter} disabled={totalChapters > 0 && chapterNumber >= totalChapters} className="flex items-center gap-2 bg-gray-800 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
                    <span>Siguiente</span><ChevronRightIcon className="w-5 h-5" />
                </button>
            </div>
        </footer>
    </div>
  );
};

export default MangaReaderView;