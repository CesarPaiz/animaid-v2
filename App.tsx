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
import { Media, MediaFormat, MediaListStatus, View, MainView } from './types';
import Spinner from './components/Spinner';
import { CloseIcon } from './components/icons';
import { getMediaDetails } from './services/anilistService';
import Toast, { ToastType } from './components/Toast';

const MAIN_VIEWS: MainView[] = ['home', 'search', 'library', 'history', 'settings'];

// --- Navigation ---
const navigate = (path: string) => {
  window.history.pushState({}, '', path);
  const navEvent = new Event('navigate');
  window.dispatchEvent(navEvent);
};

function useRoute() {
    const [pathname, setPathname] = useState(window.location.pathname);

    useEffect(() => {
        const onLocationChange = () => {
            setPathname(window.location.pathname);
        };

        window.addEventListener('popstate', onLocationChange);
        window.addEventListener('navigate', onLocationChange);

        if (window.location.pathname === '/' || window.location.pathname === '') {
            window.history.replaceState({}, '', '/home');
            onLocationChange();
        }

        return () => {
            window.removeEventListener('popstate', onLocationChange);
            window.removeEventListener('navigate', onLocationChange);
        };
    }, []);
    
    const path = (pathname.replace(/^\//, '') || 'home').split('/');
    const [page, ...params] = path;
    
    return { page: page as View, params };
}

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

const App: React.FC = () => {
  const { user, authStatus, clearAuthStatus, getMediaEntry, upsertMediaEntry, isForceReloading } = useAuth();
  const { page, params } = useRoute();
  const [currentMedia, setCurrentMedia] = useState<Media | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType; key: number } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  const handleMediaSelect = useCallback((media: Media) => {
    navigate(`/media/${media.id}`);
  }, []);

  const handleClose = useCallback(() => {
    // A more robust way to handle "back" in a SPA with history API
    if (window.history.length > 1) {
        window.history.back();
    } else {
        navigate('/home');
    }
  }, []);
  
  const handleStartPlayback = useCallback((media: Media, unit: number) => {
    const isManga = media.format === MediaFormat.MANGA || media.format === MediaFormat.NOVEL || media.format === MediaFormat.ONE_SHOT;
    navigate(`/play/${isManga ? 'manga' : 'anime'}/${media.id}/${unit}`);
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
             navigate(`/play/${type}/${id}/${newUnit}`);
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
                    status: updatedEntry.status,
                }
            };
            setCurrentMedia(finalMedia);
            showToast(`Actualizado a "${newStatus.toLocaleLowerCase()}"`);
        } else {
            setCurrentMedia(prev => prev ? { ...prev, userProgress: previousUserProgress } : null);
            showToast('Error al actualizar', 'error');
        }
    } catch (error) {
        console.error("Failed to update status, reverting.", error);
        setCurrentMedia(prev => prev ? { ...prev, userProgress: previousUserProgress } : null);
        showToast('Error al actualizar', 'error');
    }
  }, [user, currentMedia, upsertMediaEntry, showToast]);

  useEffect(() => {
    let active = true;
    const loadMedia = async () => {
        const mediaIdStr = page === 'media' ? params[0] : (page === 'play' ? params[1] : null);
        if (mediaIdStr) {
            const mediaId = parseInt(mediaIdStr, 10);
            if (!isNaN(mediaId)) {
                if (currentMedia?.id === mediaId && page !== 'play') return;

                setIsLoading(true);
                setCurrentMedia(null);
                try {
                    const media = await getMediaDetails(mediaId);
                    const entry = await getMediaEntry(mediaId);
                    if (entry) {
                        media.userProgress = {
                            progress: entry.progress,
                            score: entry.score ?? 0,
                            status: entry.status,
                        };
                    }
                    if (active) setCurrentMedia(media);
                } catch(e) {
                    console.error("Failed to load media", e);
                    if (active) navigate('/home');
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
  }, [page, params.join(','), getMediaEntry]);
  
  if (isForceReloading) {
    return (
        <div className="fixed inset-0 bg-gray-950/90 z-[300] flex flex-col items-center justify-center p-4 backdrop-blur-md animate-fade-in">
            <Spinner />
            <p className="mt-4 text-lg font-semibold text-gray-100 text-center">La carga está tardando más de lo esperado.<br/>Refrescando la aplicación...</p>
        </div>
    );
  }

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
      return <MangaReaderView media={currentMedia} chapterNumber={unit} onClose={handleClose} onProgressUpdate={handleProgressUpdate} onChapterChange={handleUnitChange} showToast={showToast} />;
    }
    return <AnimePlayerView media={currentMedia} episodeNumber={unit} onClose={handleClose} onProgressUpdate={handleProgressUpdate} onEpisodeChange={handleUnitChange} showToast={showToast} />;
  }

  const activePage = (MAIN_VIEWS as readonly string[]).includes(page) ? page as MainView : 'home';
  
  const renderMainView = () => {
    switch (activePage) {
        case 'home':
            return <TrendingView onMediaSelect={handleMediaSelect} isActive={activePage === 'home'} />;
        case 'search':
            return <SearchView onMediaSelect={handleMediaSelect} />;
        case 'library':
            return user ? <LibraryView onMediaSelect={handleMediaSelect} /> : null;
        case 'history':
            return user ? <HistoryView onMediaSelect={handleMediaSelect} /> : null;
        case 'settings':
            return <SettingsView />;
        default:
            return <TrendingView onMediaSelect={handleMediaSelect} isActive={true} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <AuthStatusOverlay status={authStatus} onClose={clearAuthStatus} />
      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <div className="md:flex md:h-screen md:overflow-hidden">
          <SideNav activeView={activePage} showLibrary={!!user} navigate={navigate} />
          <main className="md:flex-grow md:ml-20 lg:ml-64 pb-24 md:pb-0 md:overflow-y-auto md:overscroll-y-contain animate-fade-in smooth-scroll">
            {renderMainView()}
          </main>
          <BottomNav activeView={activePage} showLibrary={!!user} navigate={navigate} />
        </div>
    </div>
  );
};

export default App;