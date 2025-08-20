import React, { useState, useEffect, useRef } from 'react';
import { Media, MediaList, MediaListStatus } from '../../types';
import { getTrendingAnime, getPopularAnime, getPopularManga } from '../../services/anilistService';
import MediaCard from '../MediaCard';
import Spinner from '../Spinner';
import { useAuth } from '../../context/AuthContext';
import { PlayIcon, ChevronLeftIcon, ChevronRightIcon } from '../icons';

interface MediaRowProps {
  title: string;
  mediaList: Media[];
  isLoading: boolean;
  onMediaSelect: (media: Media) => void;
}

const MediaRow: React.FC<MediaRowProps> = ({ title, mediaList, isLoading, onMediaSelect }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = scrollRef.current.offsetWidth * 0.8;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth',
            });
        }
    };
    
    return (
        <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-100 px-4 md:px-6 lg:px-8 mb-4">{title}</h2>
            {isLoading && mediaList.length === 0 ? <Spinner /> : (
            <div className="relative group">
                <div ref={scrollRef} className="flex space-x-4 overflow-x-auto px-4 md:px-6 lg:px-8 pb-4 scrollbar-hide">
                {mediaList.map(media => (
                    <div key={media.id} className="w-36 sm:w-40 md:w-48 lg:w-52 flex-shrink-0">
                    <MediaCard media={media} onClick={() => onMediaSelect(media)} />
                    </div>
                ))}
                </div>
                {/* --- Desktop Scroll Buttons --- */}
                <button
                    onClick={() => scroll('left')}
                    aria-label="Scroll left"
                    className="hidden md:flex absolute top-1/2 -translate-y-1/2 left-0 z-20 w-12 h-full items-center justify-center bg-gradient-to-r from-gray-950/80 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 focus:outline-none"
                >
                    <ChevronLeftIcon className="w-8 h-8" />
                </button>
                <button
                    onClick={() => scroll('right')}
                    aria-label="Scroll right"
                    className="hidden md:flex absolute top-1/2 -translate-y-1/2 right-0 z-20 w-12 h-full items-center justify-center bg-gradient-to-l from-gray-950/80 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 focus:outline-none"
                >
                    <ChevronRightIcon className="w-8 h-8" />
                </button>
            </div>
            )}
        </section>
    );
};

const LastWatchedCard: React.FC<{ list: MediaList[], onMediaSelect: (media: Media) => void }> = ({ list, onMediaSelect }) => {
    // Filter for items that have progress and are not marked as completed by the user.
    // The list is pre-sorted by `updatedAt` descending from `getHistoryList`.
    const lastWatched = list.filter(item => item.progress > 0 && item.status !== MediaListStatus.COMPLETED)[0];

    if (!lastWatched) return null;

    const { media, progress } = lastWatched;
    const total = media.episodes || media.chapters || 1;
    const progressPercentage = total > 0 ? (progress / total) * 100 : 0;
    
    return (
        <section className="mb-10 px-4 md:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-100 mb-4">Continuar donde lo dejaste</h2>
            <button 
                onClick={() => onMediaSelect(media)} 
                className="w-full bg-gray-900 rounded-2xl overflow-hidden text-left relative flex items-end md:items-center p-4 group transition-transform duration-300 ease-in-out active:scale-95 md:hover:scale-[1.02] shadow-lg"
            >
                <img src={media.bannerImage || media.coverImage.extraLarge} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-40 transition-opacity duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/40 to-transparent md:bg-gradient-to-r"></div>
                <div className="relative z-10 flex items-center w-full gap-4 md:flex-row">
                    <img src={media.coverImage.large} alt={media.title.romaji} className="w-20 h-28 md:w-24 md:h-36 object-cover rounded-md flex-shrink-0 shadow-2xl"/>
                    <div className="flex-grow min-w-0">
                        <h3 className="font-bold text-white truncate text-lg">{media.title.english || media.title.romaji}</h3>
                        <p className="text-sm text-gray-300">
                            {media.format === 'MANGA' ? 'Capítulo' : 'Episodio'} {progress + 1}
                        </p>
                         <div className="w-full bg-gray-700/50 rounded-full h-2 mt-3 overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full" style={{width: `${progressPercentage}%`}}></div>
                        </div>
                    </div>
                    <div className="bg-indigo-600 rounded-full p-3 shadow-lg ml-auto flex-shrink-0 self-center">
                       <PlayIcon className="w-6 h-6 text-white"/>
                    </div>
                </div>
            </button>
        </section>
    );
};

interface TrendingViewProps {
  onMediaSelect: (media: Media) => void;
  isActive: boolean;
}

const TrendingView: React.FC<TrendingViewProps> = ({ onMediaSelect, isActive }) => {
  const [trending, setTrending] = useState<Media[]>([]);
  const [popularAnime, setPopularAnime] = useState<Media[]>([]);
  const [popularManga, setPopularManga] = useState<Media[]>([]);
  const [userHistory, setUserHistory] = useState<MediaList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, getHistoryList } = useAuth();

  useEffect(() => {
    if (!isActive) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [
          trendingData,
          popularAnimeData,
          popularMangaData,
          historyData,
        ] = await Promise.all([
          getTrendingAnime(),
          getPopularAnime(),
          getPopularManga(),
          user ? getHistoryList() : Promise.resolve<MediaList[]>([]),
        ]);
        
        setTrending(trendingData);
        setPopularAnime(popularAnimeData);
        setPopularManga(popularMangaData);
        setUserHistory(historyData);

      } catch (error) {
        console.error("Failed to fetch trending media:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, getHistoryList, isActive]);

  return (
    <div className="pt-8">
      <header className="px-4 md:px-6 lg:px-8 mb-8">
        <h1 className="text-4xl font-black tracking-tighter text-white">
          <span className="animated-gradient">Animaid</span>
        </h1>
        <p className="text-gray-400 mt-1">
          {user ? `Bienvenido de nuevo, ${user.username}` : 'Descubre tu próximo anime favorito.'}
        </p>
      </header>
      
      {user && !isLoading && userHistory.length > 0 && <LastWatchedCard list={userHistory} onMediaSelect={onMediaSelect} />}

      <MediaRow title="Tendencias del Momento" mediaList={trending} isLoading={isLoading} onMediaSelect={onMediaSelect} />
      <MediaRow title="Anime Popular" mediaList={popularAnime} isLoading={isLoading} onMediaSelect={onMediaSelect} />
      <MediaRow title="Manga Popular" mediaList={popularManga} isLoading={isLoading} onMediaSelect={onMediaSelect} />
    </div>
  );
};

export default TrendingView;
