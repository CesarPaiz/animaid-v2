import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Media, MediaListStatus, MediaStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { getAnimeEpisodeSourcesFromProvider, ANIME_PROVIDERS, VideoSource, DebugLogEntry } from '../../services/contentService';
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, CopyIcon, CheckIconSolid, ChevronUpIcon, Cog6ToothIcon } from '../icons';
import Spinner from '../Spinner';

interface ProviderStatus {
  status: 'loading' | 'success' | 'error';
  data?: VideoSource[] | null;
  log: DebugLogEntry[];
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
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            title={title}
            sandbox="allow-forms allow-presentation allow-same-origin allow-scripts"
        />
    );
};

const DebugStep: React.FC<{ entry: DebugLogEntry; index: number }> = ({ entry, index }) => {
    const [isOpen, setIsOpen] = useState(index === 0);
    const isError = !!entry.error;

    return (
        <div className="bg-gray-800 rounded-lg mb-2 overflow-hidden border border-gray-700">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex justify-between items-center p-3 text-left ${isError ? 'bg-red-500/20' : 'bg-gray-700/50'}`}
            >
                <span className="font-semibold text-sm text-gray-100">{entry.step}</span>
                <ChevronRightIcon className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-3 text-xs text-gray-300 space-y-3 border-t border-gray-700">
                    {entry.url && (
                        <div>
                            <strong className="text-gray-100 block mb-1">URL Solicitada:</strong>
                            <p className="font-mono bg-gray-900 p-2 rounded break-all">{entry.url}</p>
                        </div>
                    )}
                    {entry.extracted && (
                         <div>
                            <strong className="text-gray-100 block mb-1">Información Extraída:</strong>
                            <p className="bg-gray-900 p-2 rounded break-words">{entry.extracted}</p>
                        </div>
                    )}
                    {entry.response && (
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <strong className="text-gray-100">Respuesta Completa:</strong>
                                <button onClick={() => navigator.clipboard.writeText(JSON.stringify(entry.response, null, 2))} className="text-gray-400 hover:text-white p-1 rounded-full"><CopyIcon className="w-4 h-4" /></button>
                            </div>
                            <pre className="bg-gray-900 p-2 rounded text-xs max-h-64 overflow-auto font-mono whitespace-pre-wrap">
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

  return (
    <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-gray-900/95 border border-gray-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
            <h3 className="text-lg font-bold text-white">Inspector de Procesos</h3>
           <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700">
              <CloseIcon className="w-6 h-6"/>
           </button>
        </header>
        <div className="flex-shrink-0 border-b border-gray-700 overflow-x-auto scrollbar-hide">
          <div className="flex p-2 gap-2">
            {providers.map(provider => {
               const status = providerStatus.get(provider)?.status;
               let indicatorColor = 'bg-gray-500';
               if (status === 'success') indicatorColor = 'bg-green-500';
               if (status === 'error') indicatorColor = 'bg-red-500';
              return (
                <button
                  key={provider}
                  onClick={() => setActiveProvider(provider)}
                  className={`flex-shrink-0 px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${activeProvider === provider ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
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
            <div className="text-center py-10 text-gray-500">
                <p>No hay registros para este proveedor.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ProviderCard: React.FC<{ 
    name: string; 
    statusInfo: ProviderStatus;
    showInspect: boolean;
    onSelect: () => void;
    onInspect: () => void;
}> = ({ name, statusInfo, showInspect, onSelect, onInspect }) => {
    const isSuccess = statusInfo.status === 'success' && statusInfo.data && statusInfo.data.length > 0;
    
    let cardClasses = 'bg-gray-900 border-gray-700/80';
    if (isSuccess) cardClasses = 'bg-green-500/10 border-green-500/50';
    else if (statusInfo.status === 'error') cardClasses = 'bg-red-500/10 border-red-500/50';

    const lastError = statusInfo.status === 'error' ? statusInfo.log.find(l => l.error)?.error : null;

    return (
        <div className={`w-full p-3 border rounded-lg transition-all ${cardClasses}`}>
            <div className="flex justify-between items-center gap-2">
                <div className="flex-grow">
                    <span className="font-bold capitalize">{name}</span>
                    {statusInfo.status === 'error' && lastError && (
                        <p className="text-xs text-red-400/80 mt-1 break-words">{lastError}</p>
                    )}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                    {statusInfo.status === 'loading' && <div className="w-5 h-5 border-2 border-gray-500 border-t-indigo-400 rounded-full animate-spin"></div>}
                    {showInspect && <button onClick={onInspect} className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 p-1.5 rounded-md">
                        <Cog6ToothIcon className="w-4 h-4" />
                    </button>}
                    <button 
                        disabled={!isSuccess} 
                        onClick={onSelect}
                        className="font-semibold text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-md disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed hover:enabled:bg-indigo-500 transition-colors"
                    >
                        {isSuccess ? 'Ver' : (statusInfo.status === 'error' ? 'Error' : '...')}
                    </button>
                </div>
            </div>
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
                className="bg-gray-900/90 border-t border-gray-700 rounded-t-2xl shadow-2xl max-h-[50vh] flex flex-col animate-slide-up"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-700 sticky top-0 bg-gray-900/90 flex items-center justify-between">
                    <h4 className="font-bold text-center text-white flex-grow">Seleccionar Fuente</h4>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><CloseIcon className="w-5 h-5"/></button>
                </div>
                <ul className="p-2 space-y-1 overflow-y-auto">
                    {sources.map((source, index) => (
                        <li key={`${source.name}-${index}`}>
                            <button 
                                onClick={() => { onSelect(index); onClose(); }}
                                className={`w-full text-left p-3 rounded-lg flex justify-between items-center transition-colors ${activeIndex === index ? 'bg-indigo-600/50 text-white' : 'hover:bg-gray-700/50 text-gray-300'}`}
                            >
                                <span>{source.name}</span>
                                {activeIndex === index && <CheckIconSolid className="w-5 h-5 text-indigo-300"/>}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const AnimePlayerView: React.FC<AnimePlayerViewProps> = ({ media, episodeNumber, onClose, onProgressUpdate, onEpisodeChange }) => {
  const { user, upsertMediaEntry, isDebugMode } = useAuth();
  
  const [providerStatus, setProviderStatus] = useState<Map<string, ProviderStatus>>(new Map());
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);

  const [inspectorProvider, setInspectorProvider] = useState<string | null>(null);
  const [isSourceSelectorOpen, setIsSourceSelectorOpen] = useState(false);
  const [isSyncing, setIsSyncing] =useState(false);
  
  const watchTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    } else if (totalEpisodes === 1 && episodeToMark === 1 && media.status === MediaStatus.FINISHED) { // Case for movies
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
                progress: updatedEntry.progress, score: updatedEntry.score, status: updatedEntry.status 
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
      watchTimerRef.current = setTimeout(() => {
        markProgress(episodeNumber);
      }, 120000); // 2 minutes
    }

    return () => {
      if (watchTimerRef.current) clearTimeout(watchTimerRef.current);
    };
  }, [activeProvider, episodeNumber, media.userProgress?.progress, user, markProgress]);

  useEffect(() => {
    setProviderStatus(new Map());
    setActiveProvider(null);
    setActiveSourceIndex(0);

    const baseTitle = media.title.romaji || media.title.english || '';
    
    ANIME_PROVIDERS.forEach(provider => {
      let searchTitle = baseTitle.toLowerCase();
      if (provider !== 'flv') {
        searchTitle = searchTitle.replace(/\s+/g, '-');
      }
      
      setProviderStatus(prev => new Map(prev).set(provider, { status: 'loading', log: [] }));
      getAnimeEpisodeSourcesFromProvider(provider, searchTitle, episodeNumber)
        .then(result => {
          setProviderStatus(prev => new Map(prev).set(provider, { 
              status: result.data && result.data.length > 0 ? 'success' : 'error', 
              data: result.data, 
              log: result.log 
          }));
        });
    });
  }, [media.title.english, media.title.romaji, episodeNumber]);

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
      {inspectorProvider && (
          <ProcessInspectorModal providerStatus={providerStatus} initialProvider={inspectorProvider} onClose={() => setInspectorProvider(null)} />
      )}
      {activeProvider && activeProviderData && (
          <SourceSelectorModal isOpen={isSourceSelectorOpen} onClose={() => setIsSourceSelectorOpen(false)} sources={activeProviderData} activeIndex={activeSourceIndex} onSelect={setActiveSourceIndex}/>
      )}
      
      <header className="p-3 bg-gray-950/80 backdrop-blur-md flex items-center z-10 flex-shrink-0 border-b border-gray-800/80 absolute top-0 left-0 right-0">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700/60 transition-colors" aria-label="Volver">
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
        <div className="text-center flex-1 mx-4 min-w-0">
          <h1 className="text-base font-bold truncate">{media.title.english || media.title.romaji}</h1>
          <h2 className="text-sm text-gray-300">Episodio {episodeNumber}</h2>
        </div>
        <div className="w-10 h-10 flex-shrink-0" />
      </header>

      <main className="flex-grow w-full flex items-center justify-center relative bg-black overflow-hidden">
        {!activeProvider ? (
            <div className="w-full max-w-md mx-auto p-4 space-y-3 overflow-y-auto">
                <h3 className="text-lg font-bold text-center mb-4">Selecciona un proveedor</h3>
                {ANIME_PROVIDERS.map(provider => {
                    const statusInfo = providerStatus.get(provider) || { status: 'loading', log: [] };
                    return <ProviderCard key={provider} name={provider} statusInfo={statusInfo} showInspect={isDebugMode} onSelect={() => handleProviderSelect(provider)} onInspect={() => setInspectorProvider(provider)} />;
                })}
            </div>
        ) : activeSource ? (
          <VideoPlayer source={activeSource} title={`Player for ${media.title.romaji}`} />
        ) : (
          <div className="text-center p-4">
              <p className="text-gray-300">No se pudo cargar el video desde {activeProvider}.</p>
              <button onClick={() => setActiveProvider(null)} className="mt-2 text-indigo-400 font-semibold">Probar otro proveedor</button>
          </div>
        )}
      </main>

      <footer className="p-3 bg-gray-950/80 backdrop-blur-md z-10 flex-shrink-0 border-t border-gray-800/80 absolute bottom-0 left-0 right-0">
        <div className="flex flex-col items-center w-full max-w-4xl mx-auto space-y-2">
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