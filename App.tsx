import React, { useState, useCallback, useEffect } from 'react';
import BottomNav from './components/BottomNav';
import SideNav from './components/SideNav';
import TrendingView from './components/views/TrendingView';
import SearchView from './components/views/SearchView';
import LibraryView from './components/views/LibraryView';
import SettingsView from './components/views/SettingsView';
import MediaDetailView from './components/views/MediaDetailView';
import AnimePlayerView from './components/views/AnimePlayerView';
import MangaReaderView from './components/views/MangaReaderView';
import HistoryView from './components/views/HistoryView';
import { useAuth } from './context/AuthContext';
import { Media, MediaFormat, MediaListStatus } from './types';
import Spinner from './components/Spinner';
import { CloseIcon } from './components/icons';
import { getMediaDetails } from './services/anilistService';

type View = 'trending' | 'search' | 'library' | 'history' | 'settings' | 'media' | 'play';

const AuthStatusOverlay: React.FC<{ status: any; onClose: () => void; }> = ({ status, onClose }) => {
  if (!status.message) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-950/80 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
      <div className="bg-gray-900 border border-gray-700/80 rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full relative">
        {status.isError && (
          <button onClick={onClose} className="absolute top-3 right-3 p-2 text-gray-500 hover:text-white transition-colors" aria-label="Cerrar notificación">
            <CloseIcon className="w-6 h-6" />
          </button>
        )}
        {status.isLoading && <Spinner />}
        {status.message && !status.isLoading && <p className={`mt-4 text-lg font-semibold ${status.isError ? 'text-red-400' : 'text-gray-100'}`}>{status.message}</p>}
      </div>
    </div>
  );
};

const LoginView: React.FC = () => {
    const { signIn, authStatus, isSupabaseConfigured } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        signIn(email, password);
    };
    
    if (!isSupabaseConfigured) {
        return (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-950 p-4 text-center">
                 <header className="text-center mb-10">
                    <h1 className="text-5xl font-black tracking-tighter text-white">
                        <span className="bg-gradient-to-r from-red-500 to-orange-500 text-transparent bg-clip-text">Error de Configuración</span>
                    </h1>
                </header>
                <div className="w-full max-w-md bg-gray-900 p-6 rounded-2xl shadow-lg">
                    <p className="text-red-400 text-lg font-semibold mb-4">Animaid no está configurado correctamente.</p>
                    <p className="text-gray-300">
                        Parece que las variables de entorno para Supabase no están definidas. Por favor, sigue las instrucciones en el archivo <code className="bg-gray-800 text-indigo-300 p-1 rounded-sm">README.md</code> para configurar tu proyecto y añadir las variables <code className="bg-gray-800 text-indigo-300 p-1 rounded-sm">SUPABASE_URL</code> y <code className="bg-gray-800 text-indigo-300 p-1 rounded-sm">SUPABASE_ANON_KEY</code> a tu entorno.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-950 p-4">
             <header className="text-center mb-10">
                <h1 className="text-5xl font-black tracking-tighter text-white">
                    <span className="bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">Animaid</span>
                </h1>
                <p className="text-gray-400 mt-2">Inicia sesión para continuar.</p>
            </header>

            <div className="w-full max-w-sm">
                <form onSubmit={handleLogin} className="space-y-4 bg-gray-900 p-6 rounded-2xl shadow-lg">
                    <div>
                        <label htmlFor="email" className="sr-only">Email</label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            required
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-800 border-2 border-gray-700 rounded-lg py-2.5 px-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                    <div>
                        <label htmlFor="password" className="sr-only">Contraseña</label>
                        <input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-800 border-2 border-gray-700 rounded-lg py-2.5 px-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={authStatus.isLoading}
                        className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
                    >
                        {authStatus.isLoading ? (
                            <div className="w-6 h-6 border-2 border-gray-300 border-t-white rounded-full animate-spin"></div>
                        ) : 'Iniciar Sesión'}
                    </button>
                </form>
            </div>
        </div>
    );
};

function useRoute() {
    const [hash, setHash] = useState(() => window.location.hash);

    useEffect(() => {
        const handler = () => setHash(window.location.hash);
        window.addEventListener('hashchange', handler);
        if (window.location.hash === '' || window.location.hash === '#') {
            window.location.hash = '#/trending';
        }
        return () => window.removeEventListener('hashchange', handler);
    }, []);
    
    const path = (hash.replace(/^#\/?/, '') || 'trending').split('/');
    const [page, ...params] = path;
    
    return { page: page as View, params };
}

const App: React.FC = () => {
  const { user, authStatus, clearAuthStatus, getMediaEntry, upsertMediaEntry } = useAuth();
  const { page, params } = useRoute();
  const [currentMedia, setCurrentMedia] = useState<Media | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleMediaSelect = useCallback((media: Media) => {
    window.location.hash = `#/media/${media.id}`;
  }, []);

  const handleClose = useCallback(() => {
    window.history.back();
  }, []);
  
  const handleStartPlayback = useCallback((media: Media, unit: number) => {
    const isManga = media.format === MediaFormat.MANGA || media.format === MediaFormat.NOVEL || media.format === MediaFormat.ONE_SHOT;
    window.location.hash = `#/play/${isManga ? 'manga' : 'anime'}/${media.id}/${unit}`;
  }, []);

  const handleProgressUpdate = useCallback((updatedMedia: Media) => {
    setCurrentMedia(updatedMedia);
  }, []);

  const handleUnitChange = useCallback((newUnit: number) => {
    if (page === 'play' && params.length >= 2 && currentMedia) {
        const [type, id] = params;
        const isManga = type === 'manga';
        const totalUnits = isManga ? currentMedia.chapters : currentMedia.episodes;

        if (newUnit >= 1 && (!totalUnits || newUnit <= totalUnits)) {
             window.location.hash = `#/play/${type}/${id}/${newUnit}`;
        }
    }
  }, [page, params, currentMedia]);

   const handleStatusUpdate = useCallback(async (newStatus: MediaListStatus) => {
    if (!user || !currentMedia) return;

    const previousUserProgress = currentMedia.userProgress;
    const isManga = currentMedia.format === MediaFormat.MANGA || currentMedia.format === MediaFormat.NOVEL || currentMedia.format === MediaFormat.ONE_SHOT;

    const optimisticMedia: Media = {
        ...currentMedia,
        userProgress: {
            progress: currentMedia.userProgress?.progress || 0,
            score: currentMedia.userProgress?.score || 0,
            status: newStatus,
        }
    };
    setCurrentMedia(optimisticMedia);

    try {
        const updatedEntry = await upsertMediaEntry({
            media_id: currentMedia.id,
            progress: previousUserProgress?.progress || 0,
            status: newStatus,
            media_type: isManga ? 'MANGA' : 'ANIME'
        });
        
        if (updatedEntry) {
             const finalMedia: Media = {
                ...currentMedia,
                userProgress: {
                    progress: updatedEntry.progress,
                    score: updatedEntry.score ?? 0,
                    status: updatedEntry.status as MediaListStatus,
                }
            };
            setCurrentMedia(finalMedia);
        } else {
            setCurrentMedia(prev => prev ? { ...prev, userProgress: previousUserProgress } : null);
        }
    } catch (error) {
        console.error("Failed to update status, reverting.", error);
        setCurrentMedia(prev => prev ? { ...prev, userProgress: previousUserProgress } : null);
    }
  }, [user, currentMedia, upsertMediaEntry]);

  useEffect(() => {
    let active = true;
    const loadMedia = async () => {
        const mediaIdStr = page === 'media' ? params[0] : (page === 'play' ? params[1] : null);
        if (mediaIdStr) {
            const mediaId = parseInt(mediaIdStr, 10);
            if (!isNaN(mediaId)) {
                if (currentMedia?.id === mediaId) return;

                setIsLoading(true);
                setCurrentMedia(null);
                try {
                    const media = await getMediaDetails(mediaId);
                    const entry = await getMediaEntry(mediaId);
                    if (entry) {
                        media.userProgress = {
                            progress: entry.progress,
                            score: entry.score ?? 0,
                            status: entry.status as MediaListStatus,
                        };
                    }
                    if (active) setCurrentMedia(media);
                } catch(e) {
                    console.error("Failed to load media", e);
                    if (active) window.location.hash = '#/trending';
                } finally {
                    if (active) setIsLoading(false);
                }
            }
        } else {
            setCurrentMedia(null);
        }
    };
    
    loadMedia();
    return () => { active = false; };
  }, [page, params.join(','), getMediaEntry, currentMedia?.id]);
  
  const renderMainView = (page: View) => {
    switch (page) {
      case 'trending':
        return <TrendingView onMediaSelect={handleMediaSelect} />;
      case 'search':
        return <SearchView onMediaSelect={handleMediaSelect} />;
      case 'library':
        return <LibraryView onMediaSelect={handleMediaSelect} />;
      case 'history':
        return <HistoryView onMediaSelect={handleMediaSelect} />;
      case 'settings':
        return <SettingsView />;
      default:
        return <TrendingView onMediaSelect={handleMediaSelect} />;
    }
  };
  
  if (authStatus.isLoading && !user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-200">
        <AuthStatusOverlay status={authStatus} onClose={clearAuthStatus} />
        <LoginView />
      </div>
    );
  }

  if (isLoading) {
      return (
          <div className="min-h-screen bg-gray-950 flex items-center justify-center">
              <Spinner />
          </div>
      );
  }

  if (page === 'media' && currentMedia) {
      return <MediaDetailView media={currentMedia} onClose={handleClose} onStartPlayback={handleStartPlayback} onStatusChange={handleStatusUpdate} />
  }

  if (page === 'play' && params.length >= 3 && currentMedia) {
    const type = params[0];
    const unit = parseInt(params[2], 10);
    const isManga = type === 'manga';

    if (isManga) {
      return <MangaReaderView media={currentMedia} chapterNumber={unit} onClose={handleClose} onProgressUpdate={handleProgressUpdate} onChapterChange={handleUnitChange} />;
    }
    return <AnimePlayerView media={currentMedia} episodeNumber={unit} onClose={handleClose} onProgressUpdate={handleProgressUpdate} onEpisodeChange={handleUnitChange} />;
  }
  
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <AuthStatusOverlay status={authStatus} onClose={clearAuthStatus} />
        <div className="md:flex">
          <SideNav activeView={page} showLibrary={!!user} />
          <main className="md:flex-grow md:ml-20 lg:ml-64 pb-24 md:pb-8">
            {renderMainView(page)}
          </main>
          <BottomNav activeView={page} showLibrary={!!user} />
        </div>
    </div>
  );
};

export default App;
