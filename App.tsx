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

type View = 'trending' | 'search' | 'library' | 'history' | 'settings';
type PlaybackState = { media: Media; unit: number } | null;

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('trending');
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [activePlayback, setActivePlayback] = useState<PlaybackState>(null);
  const { user } = useAuth();

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
      return <MangaReaderView media={activePlayback.media} chapterNumber={activePlayback.unit} onClose={handleClosePlayback} onProgressUpdate={setSelectedMedia} onChapterChange={handleUnitChange} />;
    }
    return <AnimePlayerView media={activePlayback.media} episodeNumber={activePlayback.unit} onClose={handleClosePlayback} onProgressUpdate={setSelectedMedia} onEpisodeChange={handleUnitChange} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {selectedMedia ? (
        <MediaDetailView 
            media={selectedMedia} 
            onClose={handleCloseDetail} 
            onStartPlayback={handleStartPlayback}
        />
      ) : (
        <>
          <main className="pb-20">
            {renderView()}
          </main>
          <BottomNav activeView={activeView} setActiveView={setActiveView} showLibrary={!!user} />
        </>
      )}
    </div>
  );
};

export default App;