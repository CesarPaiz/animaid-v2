import React, { useState, useCallback } from 'react';
import BottomNav from './components/BottomNav';
import TrendingView from './components/views/TrendingView';
import SearchView from './components/views/SearchView';
import LibraryView from './components/views/LibraryView';
import SettingsView from './components/views/SettingsView';
import MediaDetailView from './components/views/MediaDetailView';
import AnimePlayerView from './components/views/AnimePlayerView';
import MangaReaderView from './components/views/MangaReaderView';
import HistoryView from './components/views/HistoryView';
import { useAuth } from './context/AuthContext';
import { Media, MediaFormat } from './types';
import Spinner from './components/Spinner';
import { CloseIcon } from './components/icons';

type View = 'trending' | 'search' | 'library' | 'history' | 'settings';
type PlaybackState = { media: Media; unit: number } | null;

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
        {status.message && <p className={`mt-4 text-lg font-semibold ${status.isError ? 'text-red-400' : 'text-gray-100'}`}>{status.message}</p>}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('trending');
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [activePlayback, setActivePlayback] = useState<PlaybackState>(null);
  const { user, authStatus, clearAuthStatus } = useAuth();

  const handleMediaSelect = useCallback((media: Media) => {
    setSelectedMedia(media);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedMedia(null);
  }, []);
  
  const handleStartPlayback = useCallback((media: Media, unit: number) => {
    setActivePlayback({ media, unit });
    setSelectedMedia(media); // Ensure detail view is aware of the current media
  }, []);

  const handleClosePlayback = useCallback(() => {
    setActivePlayback(null);
  }, []);

  const handleProgressUpdate = useCallback((updatedMedia: Media) => {
    setSelectedMedia(prev => prev ? updatedMedia : null);
    setActivePlayback(prev => {
        if (!prev) return null;
        return { ...prev, media: updatedMedia };
    });
  }, []);

  const handleUnitChange = useCallback((newUnit: number) => {
    setActivePlayback(prev => {
        if (!prev) return prev;
        
        const isManga = prev.media.format === MediaFormat.MANGA || prev.media.format === MediaFormat.NOVEL || prev.media.format === MediaFormat.ONE_SHOT;
        const totalUnits = isManga ? prev.media.chapters : prev.media.episodes;

        if (!totalUnits || newUnit < 1 || newUnit > totalUnits) {
             return prev;
        }
        return { ...prev, unit: newUnit };
    });
  }, []);

  const renderView = () => {
    switch (activeView) {
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

  if (activePlayback) {
    const isManga = activePlayback.media.format === MediaFormat.MANGA || activePlayback.media.format === MediaFormat.NOVEL || activePlayback.media.format === MediaFormat.ONE_SHOT;
    if (isManga) {
      return <MangaReaderView media={activePlayback.media} chapterNumber={activePlayback.unit} onClose={handleClosePlayback} onProgressUpdate={handleProgressUpdate} onChapterChange={handleUnitChange} />;
    }
    return <AnimePlayerView media={activePlayback.media} episodeNumber={activePlayback.unit} onClose={handleClosePlayback} onProgressUpdate={handleProgressUpdate} onEpisodeChange={handleUnitChange} />;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      <AuthStatusOverlay status={authStatus} onClose={clearAuthStatus} />
      {selectedMedia ? (
        <MediaDetailView 
            media={selectedMedia} 
            onClose={handleCloseDetail} 
            onStartPlayback={handleStartPlayback}
        />
      ) : (
        <>
          <main className="pb-24">
            {renderView()}
          </main>
          <BottomNav activeView={activeView} setActiveView={setActiveView} showLibrary={!!user} />
        </>
      )}
    </div>
  );
};

export default App;