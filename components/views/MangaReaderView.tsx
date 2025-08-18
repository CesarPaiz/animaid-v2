import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Media, MediaListStatus, MediaStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getMangaChapterPagesFromProvider, MANGA_PROVIDERS, MangaPage, DebugLogEntry, SearchResult } from '../../services/contentService';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, Cog6ToothIcon, BookOpenIcon } from '../icons';
import Spinner from '../Spinner';
import { getProviderMapping, saveProviderMapping } from '../../services/providerSelection';

interface ProviderStatus {
  status: 'loading' | 'success' | 'error' | 'selecting';
  data?: MangaPage[] | null;
  log: DebugLogEntry[];
  searchResults?: SearchResult[];
  selectedResult?: SearchResult;
}

interface MangaReaderViewProps {
  media: Media;
  chapterNumber: number;
  onClose: () => void;
  onProgressUpdate: (updatedMedia: Media) => void;
  onChapterChange: (newChapter: number) => void;
}

const SearchResultSelectorModal: React.FC<{
    providerName: string;
    results: SearchResult[];
    currentSelection?: SearchResult;
    onSelect: (result: SearchResult) => void;
    onClose: () => void;
}> = ({ providerName, results, currentSelection, onSelect, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-gray-900/95 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-bold text-white capitalize">Seleccionar resultado para {providerName}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700"><CloseIcon className="w-6 h-6"/></button>
                </header>
                <div className="p-4 overflow-y-auto flex-grow space-y-2">
                    {results.length > 0 ? results.map((result) => {
                        const isSelected = currentSelection?.url === result.url;
                        return (
                            <button key={result.url} onClick={() => onSelect(result)} className={`w-full flex items-center gap-4 p-3 rounded-lg text-left transition-colors border ${isSelected ? 'bg-indigo-500/20 border-indigo-500' : 'bg-gray-800/50 border-gray-700 hover:bg-gray-700/80'}`}>
                                {result.img && <img src={result.img} alt={result.title || (result as any).name} className="w-14 h-20 object-cover rounded-md flex-shrink-0"/>}
                                <div className="flex-grow min-w-0">
                                    <p className={`font-semibold truncate ${isSelected ? 'text-indigo-300' : 'text-white'}`}>{result.title || (result as any).name}</p>
                                </div>
                            </button>
                        )
                    }) : <p className="text-gray-400 text-center py-8">No se encontraron resultados alternativos.</p>}
                </div>
            </div>
        </div>
    )
};


const MangaReaderView: React.FC<MangaReaderViewProps> = ({ media, chapterNumber, onClose, onProgressUpdate, onChapterChange }) => {
  const { user, upsertMediaEntry, isDebugMode } = useAuth();
  const [providerStatus, setProviderStatus] = useState<Map<string, ProviderStatus>>(new Map());
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [selectorOpenFor, setSelectorOpenFor] = useState<string | null>(null);
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
  
  const fetchChapterPages = useCallback(async (provider: string, selectedResult?: SearchResult) => {
    setProviderStatus(prev => new Map(prev).set(provider, { status: 'loading', log: [] }));

    const result = await getMangaChapterPagesFromProvider(provider, media, chapterNumber, selectedResult);
    
    setProviderStatus(prev => new Map(prev).set(provider, { 
        status: result.data && result.data.length > 0 ? 'success' : 'error', 
        data: result.data, 
        log: result.log,
        searchResults: result.searchResults,
        selectedResult: result.selectedResult
    }));
  }, [media, chapterNumber]);

  const handleResultSelection = (provider: string, result: SearchResult) => {
      saveProviderMapping(media.id, provider, result);
      setSelectorOpenFor(null);
      fetchChapterPages(provider, result);
  };

  useEffect(() => {
    setProviderStatus(new Map());
    setActiveProvider(null);
    setCurrentPage(1);
    if(scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
    
    MANGA_PROVIDERS.forEach(provider => {
        const savedMapping = getProviderMapping(media.id, provider);
        fetchChapterPages(provider, savedMapping);
    });
  }, [media, chapterNumber, fetchChapterPages]);
  
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
        {selectorOpenFor && (
             <SearchResultSelectorModal
                providerName={selectorOpenFor}
                results={providerStatus.get(selectorOpenFor)?.searchResults || []}
                currentSelection={providerStatus.get(selectorOpenFor)?.selectedResult}
                onSelect={(result) => handleResultSelection(selectorOpenFor, result)}
                onClose={() => setSelectorOpenFor(null)}
            />
        )}
        
        <header className={`p-3 bg-gray-950/80 backdrop-blur-md flex items-center z-10 flex-shrink-0 border-b border-gray-800/80 absolute top-0 left-0 right-0 transition-transform duration-300 ${showControls ? 'translate-y-0' : '-translate-y-full'}`}>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700/60"><ArrowLeftIcon className="w-6 h-6" /></button>
            <div className="text-center flex-1 mx-2 min-w-0">
                 <h1 className="text-2xl font-black tracking-tighter text-white">
                    <span className="animated-gradient">Animaid</span>
                 </h1>
                 <h2 className="text-sm text-gray-400 truncate mt-0.5">
                    {media.title.english || media.title.romaji} - Cap. {chapterNumber}
                 </h2>
            </div>
             {activeProvider ? (<button onClick={() => setActiveProvider(null)} className="text-sm bg-gray-800 px-3 py-2 rounded-lg capitalize hover:bg-gray-700">Cambiar</button>) : <div className="w-24 h-10"/>}
        </header>

        <main ref={scrollContainerRef} className="flex-grow w-full overflow-y-auto bg-black" onClick={() => activeProvider && setShowControls(c => !c)}>
            {!activeProvider ? (
                <div className="flex items-center justify-center min-h-full p-4">
                    <div className="relative bg-gray-900/80 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-fade-in">
                        <h3 className="text-xl font-bold text-center mb-2 text-white">Selecciona un proveedor</h3>
                        {MANGA_PROVIDERS.map(provider => {
                            const statusInfo = providerStatus.get(provider) || { status: 'loading', log: [] };
                            const isSuccess = statusInfo.status === 'success' && statusInfo.data && statusInfo.data.length > 0;
                            
                            return (
                                <div key={provider} className="flex items-center gap-2">
                                    <button
                                        onClick={() => setActiveProvider(provider)}
                                        disabled={!isSuccess}
                                        className="w-full flex items-center justify-between p-4 rounded-lg transition-colors font-semibold text-lg
                                                  bg-gray-800/70 border border-gray-700/80
                                                  disabled:opacity-60 disabled:cursor-not-allowed
                                                  hover:enabled:bg-indigo-600/40 hover:enabled:border-indigo-500/80"
                                    >
                                        <span className="capitalize">{provider}</span>
                                        {statusInfo.status === 'loading' && <div className="w-5 h-5 border-2 border-gray-500 border-t-white rounded-full animate-spin"></div>}
                                        {statusInfo.status === 'error' && <span className="text-sm font-medium text-red-400">Error</span>}
                                        {isSuccess && <BookOpenIcon className="w-6 h-6 text-indigo-400" />}
                                    </button>
                                     {isSuccess && (
                                        <button onClick={() => setSelectorOpenFor(provider)} className="p-3 rounded-lg bg-gray-800/70 border border-gray-700/80 text-gray-400 hover:text-white hover:bg-gray-700/90 transition-colors">
                                            <Cog6ToothIcon className="w-6 h-6"/>
                                        </button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
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
        
        <footer className={`p-2 bg-gray-950/80 backdrop-blur-md z-10 flex-shrink-0 border-t border-gray-800/80 absolute bottom-0 left-0 right-0 transition-transform duration-300 ${showControls && activeProvider ? 'translate-y-0' : 'translate-y-full'}`}>
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