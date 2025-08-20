import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Media, MediaListStatus, MediaStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getAnimeEpisodeSourcesFromProvider, ANIME_PROVIDERS, VideoSource, DebugLogEntry, SearchResult } from '../../services/contentService';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, CheckIconSolid, ChevronUpIcon, Cog6ToothIcon, PlayIcon, SearchIcon } from '../icons';
import Spinner from '../Spinner';
import { getProviderMapping, saveProviderMapping } from '../../services/providerSelection';
import { sanitizeTitleForProvider } from '../../services/titleSanitizer';


interface ProviderStatus {
  status: 'loading' | 'success' | 'error' | 'selecting';
  data?: VideoSource[] | null;
  log: DebugLogEntry[];
  searchResults?: SearchResult[];
  selectedResult?: SearchResult;
}

interface AnimePlayerViewProps {
  media: Media;
  episodeNumber: number;
  onClose: () => void;
  onProgressUpdate: (updatedMedia: Media) => void;
  onEpisodeChange: (newEpisode: number) => void;
}

const VideoPlayer: React.FC<{ source: VideoSource; title: string; }> = ({ source, title }) => {
    if (!source || !source.url) {
        return <div className="text-center text-gray-400">No hay fuente de video válida.</div>;
    }

    return (
        <iframe
            key={source.url}
            src={source.url}
            className="w-full h-full border-0 bg-black"
            title={title}
            allowFullScreen
        />
    );
};

const SearchResultSelectorModal: React.FC<{
    providerName: string;
    results: SearchResult[];
    currentSelection?: SearchResult;
    mediaTitle: string;
    onSelect: (result: SearchResult) => void;
    onSearch: (newQuery: string) => Promise<void>;
    onClose: () => void;
}> = ({ providerName, results, currentSelection, mediaTitle, onSelect, onSearch, onClose }) => {
    const [query, setQuery] = useState(() => sanitizeTitleForProvider(mediaTitle));
    const [isSearching, setIsSearching] = useState(false);
    
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSearching) return;
        setIsSearching(true);
        try {
            await onSearch(query);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-gray-900/95 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-bold text-white capitalize">Seleccionar resultado para {providerName}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700"><CloseIcon className="w-6 h-6"/></button>
                </header>
                <div className="p-3 border-b border-gray-700 flex-shrink-0">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Editar búsqueda..."
                            className="w-full bg-gray-800 border border-gray-600 rounded-lg py-2 px-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                         <button 
                            type="submit" 
                            disabled={isSearching}
                            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors flex-shrink-0 w-14 flex items-center justify-center disabled:bg-indigo-800"
                        >
                            {isSearching ? <div className="w-5 h-5 border-2 border-gray-400 border-t-white rounded-full animate-spin"></div> : <SearchIcon className="w-5 h-5"/>}
                        </button>
                    </form>
                </div>
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


const SimpleProviderSelector: React.FC<{
  providerStatus: Map<string, ProviderStatus>;
  onSelect: (provider: string) => void;
  onShowSelector: (provider: string) => void;
}> = ({ providerStatus, onSelect, onShowSelector }) => {
    return (
        <div className="relative bg-gray-900/80 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-fade-in">
            <h3 className="text-xl font-bold text-center mb-2 text-white">Selecciona un proveedor</h3>
            {ANIME_PROVIDERS.map(provider => {
                const statusInfo = providerStatus.get(provider) || { status: 'loading', log: [] };
                const isSuccess = statusInfo.status === 'success' && statusInfo.data && statusInfo.data.length > 0;
                const canConfigure = statusInfo.status === 'error' || (statusInfo.searchResults && statusInfo.searchResults.length > 0);
                
                return (
                    <div key={provider} className="flex items-center gap-2">
                        <button
                            onClick={() => onSelect(provider)}
                            disabled={!isSuccess}
                            className="w-full flex items-center justify-between p-4 rounded-lg transition-colors font-semibold text-lg
                                      bg-gray-800/70 border border-gray-700/80
                                      disabled:opacity-60 disabled:cursor-not-allowed
                                      hover:enabled:bg-indigo-600/40 hover:enabled:border-indigo-500/80"
                        >
                            <span className="capitalize">{provider}</span>
                            {statusInfo.status === 'loading' && <div className="w-5 h-5 border-2 border-gray-500 border-t-white rounded-full animate-spin"></div>}
                            {statusInfo.status === 'error' && <span className="text-sm font-medium text-red-400">Error</span>}
                            {isSuccess && <PlayIcon className="w-6 h-6 text-indigo-400" />}
                        </button>
                        {canConfigure && (
                            <button onClick={() => onShowSelector(provider)} className="p-3 rounded-lg bg-gray-800/70 border border-gray-700/80 text-gray-400 hover:text-white hover:bg-gray-700/90 transition-colors">
                                <Cog6ToothIcon className="w-6 h-6"/>
                            </button>
                        )}
                    </div>
                )
            })}
        </div>
    );
};


const SourceSelectorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    sources: VideoSource[];
    activeIndex: number;
    onSelect: (index: number) => void;
}> = ({ isOpen, onClose, sources, activeIndex, onSelect }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-[120] flex flex-col justify-end backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="bg-gray-900/95 border-t border-gray-700/80 rounded-t-2xl shadow-2xl max-h-[60vh] flex flex-col animate-slide-up"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 flex-shrink-0">
                    <div className="w-10 h-1.5 bg-gray-700 rounded-full mx-auto mb-3"></div>
                    <div className="flex items-center justify-between">
                        <h4 className="text-lg font-bold text-white">Seleccionar Fuente</h4>
                        <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors">
                            <CloseIcon className="w-5 h-5"/>
                        </button>
                    </div>
                </div>
                <ul className="px-3 pb-3 space-y-2 overflow-y-auto">
                    {sources.map((source, index) => {
                        const isActive = activeIndex === index;
                        return (
                            <li key={`${source.name}-${index}`}>
                                <button 
                                    onClick={() => { onSelect(index); onClose(); }}
                                    className={`w-full text-left p-4 rounded-xl flex items-center gap-4 transition-all duration-200 border-2 ${
                                        isActive 
                                        ? 'bg-indigo-500/20 border-indigo-500 text-white' 
                                        : 'bg-gray-800/60 border-transparent hover:border-gray-600 text-gray-300'
                                    }`}
                                >
                                    <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                                        {isActive ? <CheckIconSolid className="w-6 h-6 text-indigo-400"/> : <PlayIcon className="w-5 h-5 text-gray-500"/>}
                                    </div>
                                    <span className="font-semibold flex-grow">{source.name}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};

const AnimePlayerView: React.FC<AnimePlayerViewProps> = ({ media, episodeNumber, onClose, onProgressUpdate, onEpisodeChange }) => {
  const { user, upsertMediaEntry } = useAuth();
  
  const [providerStatus, setProviderStatus] = useState<Map<string, ProviderStatus>>(new Map());
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);

  const [selectorOpenFor, setSelectorOpenFor] = useState<string | null>(null);
  const [isSourceSelectorOpen, setIsSourceSelectorOpen] = useState(false);
  const [isSyncing, setIsSyncing] =useState(false);
  
  const watchTimerRef = useRef<number | null>(null);

  const markProgress = useCallback(async (episodeToMark: number) => {
    if (!user || episodeToMark <= (media.userProgress?.progress || 0)) {
        return;
    }
    
    const totalEpisodes = media.episodes || 0;
    let newStatus = media.userProgress?.status || MediaListStatus.CURRENT;

    const statusesThatBecomeCurrent: MediaListStatus[] = [MediaListStatus.PLANNING, MediaListStatus.PAUSED, MediaListStatus.DROPPED];
    if (statusesThatBecomeCurrent.includes(newStatus)) {
        newStatus = MediaListStatus.CURRENT;
    } else if (newStatus === MediaListStatus.COMPLETED) {
        newStatus = MediaListStatus.REPEATING;
    }

    if (totalEpisodes > 0 && episodeToMark >= totalEpisodes && media.status === MediaStatus.FINISHED) {
        newStatus = MediaListStatus.COMPLETED;
    } else if (totalEpisodes === 1 && episodeToMark === 1 && media.status === MediaStatus.FINISHED) {
        newStatus = MediaListStatus.COMPLETED;
    }

    try {
        setIsSyncing(true);
        const updatedEntry = await upsertMediaEntry({
            media_id: media.id,
            progress: episodeToMark,
            status: newStatus,
            media_type: 'ANIME',
        });
        if (updatedEntry) {
            const updatedMedia = { ...media, userProgress: { 
                progress: updatedEntry.progress, score: updatedEntry.score ?? 0, status: updatedEntry.status 
            }};
            onProgressUpdate(updatedMedia);
        }
    } catch (error) {
        console.error("Failed to sync progress:", error);
    } finally {
        setIsSyncing(false);
    }
  }, [user, media, upsertMediaEntry, onProgressUpdate]);
  
  useEffect(() => {
    if (watchTimerRef.current) clearTimeout(watchTimerRef.current);

    if (activeProvider && user && episodeNumber > (media.userProgress?.progress || 0)) {
      watchTimerRef.current = window.setTimeout(() => {
        markProgress(episodeNumber);
      }, 120000);
    }

    return () => {
      if (watchTimerRef.current) clearTimeout(watchTimerRef.current);
    };
  }, [activeProvider, episodeNumber, media.userProgress?.progress, user, markProgress]);

  const fetchSourcesForProvider = useCallback(async (provider: string, selectedResult?: SearchResult, customQuery?: string) => {
    setProviderStatus(prev => new Map(prev).set(provider, { status: 'loading', log: [] }));

    const result = await getAnimeEpisodeSourcesFromProvider(provider, media, episodeNumber, selectedResult, customQuery);
    
    setProviderStatus(prev => new Map(prev).set(provider, { 
        status: result.data && result.data.length > 0 ? 'success' : 'error', 
        data: result.data, 
        log: result.log,
        searchResults: result.searchResults,
        selectedResult: result.selectedResult
    }));
  }, [media, episodeNumber]);

  const handleResultSelection = (provider: string, result: SearchResult) => {
      saveProviderMapping(media.id, provider, result);
      setSelectorOpenFor(null);
      fetchSourcesForProvider(provider, result);
  };

  const handleProviderSearch = async (provider: string, query: string) => {
    await fetchSourcesForProvider(provider, undefined, query);
  };

  useEffect(() => {
    setProviderStatus(new Map());
    setActiveProvider(null);
    setActiveSourceIndex(0);
    
    ANIME_PROVIDERS.forEach(provider => {
        const savedMapping = getProviderMapping(media.id, provider);
        fetchSourcesForProvider(provider, savedMapping);
    });
  }, [media, episodeNumber, fetchSourcesForProvider]);

  const handleProviderSelect = (provider: string) => {
    const status = providerStatus.get(provider);
    if (status?.status === 'success' && status.data && status.data.length > 0) {
      setActiveSourceIndex(0);
      setActiveProvider(provider);
    }
  };
  
  const handleNextEpisode = async () => {
    await markProgress(episodeNumber);
    onEpisodeChange(episodeNumber + 1);
  };

  const totalEpisodes = media.episodes || 0;
  const activeProviderData = activeProvider ? providerStatus.get(activeProvider)?.data : undefined;
  const activeSource = activeProviderData?.[activeSourceIndex];

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col text-white animate-fade-in">
      {selectorOpenFor && (
            <SearchResultSelectorModal
                providerName={selectorOpenFor}
                results={providerStatus.get(selectorOpenFor)?.searchResults || []}
                currentSelection={providerStatus.get(selectorOpenFor)?.selectedResult}
                mediaTitle={media.title.english || media.title.romaji}
                onSelect={(result) => handleResultSelection(selectorOpenFor, result)}
                onSearch={(query) => handleProviderSearch(selectorOpenFor, query)}
                onClose={() => setSelectorOpenFor(null)}
            />
        )}

      {activeProvider && activeProviderData && (
          <SourceSelectorModal isOpen={isSourceSelectorOpen} onClose={() => setIsSourceSelectorOpen(false)} sources={activeProviderData} activeIndex={activeSourceIndex} onSelect={setActiveSourceIndex}/>
      )}
      
      <header className="p-3 bg-gray-950/80 backdrop-blur-md z-10 flex-shrink-0 border-b border-gray-800/80 absolute top-0 left-0 right-0">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700/60 transition-colors" aria-label="Volver">
            <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <div className="text-center flex-1 mx-4 min-w-0">
                <h1 className="text-2xl font-black tracking-tighter text-white">
                    <span className="animated-gradient">Animaid</span>
                </h1>
                <h2 className="text-sm text-gray-400 truncate mt-0.5">
                    {media.title.english || media.title.romaji} - Ep. {episodeNumber}
                </h2>
            </div>
            <div className="w-10 h-10 flex-shrink-0" />
        </div>
      </header>

      <main className="flex-grow w-full flex items-center justify-center relative bg-black overflow-hidden p-2 md:p-4">
        <img src={media.coverImage.extraLarge} alt="" className="absolute inset-0 w-full h-full object-cover opacity-10 blur-xl scale-110"/>
        <div className="absolute inset-0 bg-black/60"></div>
        
        {!activeProvider ? (
            <div className="flex items-center justify-center min-h-full p-4">
                <SimpleProviderSelector 
                    providerStatus={providerStatus} 
                    onSelect={handleProviderSelect}
                    onShowSelector={setSelectorOpenFor}
                />
            </div>
        ) : (
            <div className="w-full max-w-5xl aspect-video bg-black rounded-lg shadow-2xl shadow-indigo-900/40 overflow-hidden relative z-10">
              {activeSource ? (
                <VideoPlayer source={activeSource} title={`Player for ${media.title.romaji}`} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-center p-4">
                    <p className="text-gray-300">No se pudo cargar el video desde {activeProvider}.</p>
                    <button onClick={() => setActiveProvider(null)} className="mt-2 text-indigo-400 font-semibold">Probar otro proveedor</button>
                </div>
              )}
            </div>
        )}
      </main>

      <footer className="p-3 bg-gray-950/80 backdrop-blur-md z-10 flex-shrink-0 border-t border-gray-800/80 absolute bottom-0 left-0 right-0">
        <div className="flex flex-col items-center w-full max-w-5xl mx-auto space-y-2">
            <div className="w-full flex items-center justify-between gap-2">
                <button onClick={() => onEpisodeChange(episodeNumber - 1)} disabled={episodeNumber <= 1} className="flex items-center gap-2 bg-gray-800 text-white font-bold py-2 px-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeftIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">Anterior</span>
                </button>
                
                <div className="flex-grow flex items-center justify-center gap-2">
                   {activeProvider && activeSource && (
                       <button onClick={() => setIsSourceSelectorOpen(true)} className="flex-grow max-w-xs bg-gray-700/80 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-full transition-colors flex items-center justify-center gap-2">
                           <span className="truncate">{activeSource.name}</span>
                           <ChevronUpIcon className="w-4 h-4 flex-shrink-0" />
                       </button>
                   )}
                   {activeProvider && (
                        <button onClick={() => setActiveProvider(null)} className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold py-2 px-3 rounded-full transition-colors">
                            Cambiar
                        </button>
                   )}
                </div>

                <button onClick={handleNextEpisode} disabled={totalEpisodes > 0 && episodeNumber >= totalEpisodes} className="flex items-center gap-2 bg-gray-800 text-white font-bold py-2 px-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    <span className="hidden sm:inline">Siguiente</span>
                    <ChevronRightIcon className="w-5 h-5" />
                </button>
            </div>
            {isSyncing && <p className="text-xs text-indigo-400 animate-pulse font-semibold">Guardando progreso...</p>}
        </div>
      </footer>
    </div>
  );
};

export default AnimePlayerView;