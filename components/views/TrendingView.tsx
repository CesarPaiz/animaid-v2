import React, { useState, useEffect } from 'react';
import { Media, MediaList, MediaStatus } from '../../types';
import { getTrendingAnime, getPopularAnime, getPopularManga } from '../../services/anilistService';
import MediaCard from '../MediaCard';
import Spinner from '../Spinner';
import { useAuth } from '../../context/AuthContext';
import { PlayIcon } from '../icons';

interface MediaRowProps {
  title: string;
  mediaList: Media[];
  isLoading: boolean;
  onMediaSelect: (media: Media) => void;
}

const MediaRow: React.FC<MediaRowProps> = ({ title, mediaList, isLoading, onMediaSelect }) => (
  <section className="mb-10">
    <h2 className="text-2xl font-bold text-gray-100 px-4 md:px-6 lg:px-8 mb-4">{title}</h2>
    {isLoading && mediaList.length === 0 ? <Spinner /> : (
      <div className="relative">
        <div className="flex space-x-4 overflow-x-auto px-4 md:px-6 lg:px-8 pb-4 scrollbar-hide">
          {mediaList.map(media => (
            <div key={media.id} className="w-36 sm:w-40 md:w-48 flex-shrink-0">
              <MediaCard media={media} onClick={() => onMediaSelect(media)} />
            </div>
          ))}
        </div>
      </div>
    )}
  </section>
);

const LastWatchedCard: React.FC<{ list: MediaList[], onMediaSelect: (media: Media) => void }> = ({ list, onMediaSelect }) => {
    const lastWatched = list
        .filter(item => item.progress > 0 && item.media.status !== MediaStatus.FINISHED)
        .sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];

    if (!lastWatched) return null;

    const { media, progress } = lastWatched;
    const total = media.episodes || media.chapters || 1;
    const progressPercentage = total > 0 ? (progress / total) * 100 : 0;
    
    return (
        <section className="mb-10 px-4 md:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-100 mb-4">Continuar Viendo</h2>
            <button 
                onClick={() => onMediaSelect(media)} 
                className="w-full h-48 bg-gray-900 rounded-2xl overflow-hidden text-left relative flex items-end p-4 group transition-transform duration-300 ease-in-out active:scale-95 md:hover:scale-[1.02] shadow-lg"
            >
                <img src={media.bannerImage || media.coverImage.extraLarge} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity duration-300" style={{ maskImage: 'linear-gradient(to top, black 20%, transparent 100%)' }}/>
                <div className="absolute top-0 left-0 right-0 h-2/3 bg-gradient-to-t from-gray-900/50 to-transparent"></div>
                <div className="relative z-10 flex items-center w-full gap-4">
                    <img src={media.coverImage.large} alt={media.title.romaji} className="w-20 h-28 object-cover rounded-md flex-shrink-0 shadow-2xl"/>
                    <div className="flex-grow min-w-0">
                        <h3 className="font-bold text-white truncate text-lg">{media.title.english || media.title.romaji}</h3>
                        <p className="text-sm text-gray-300">
                            {media.format === 'MANGA' ? 'Capítulo' : 'Episodio'} {progress + 1}
                        </p>
                         <div className="w-full bg-gray-700/50 rounded-full h-2 mt-3 overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full" style={{width: `${progressPercentage}%`}}></div>
                        </div>
                    </div>
                    <div className="bg-indigo-600 rounded-full p-3 shadow-lg ml-auto flex-shrink-0">
                       <PlayIcon className="w-6 h-6 text-white"/>
                    </div>
                </div>
            </button>
        </section>
    );
};


const TrendingView: React.FC<{ onMediaSelect: (media: Media) => void }> = ({ onMediaSelect }) => {
  const [trending, setTrending] = useState<Media[]>([]);
  const [popularAnime, setPopularAnime] = useState<Media[]>([]);
  const [popularManga, setPopularManga] = useState<Media[]>([]);
  const [userHistory, setUserHistory] = useState<MediaList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, getHistoryList } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const publicMediaPromises = [
          getTrendingAnime(),
          getPopularAnime(),
          getPopularManga(),
        ];
        
        if (user) {
          getHistoryList().then(setUserHistory);
        } else {
          setUserHistory([]);
        }

        const [trendingData, popularAnimeData, popularMangaData] = await Promise.all(publicMediaPromises);
        
        setTrending(trendingData);
        setPopularAnime(popularAnimeData);
        setPopularManga(popularMangaData);

      } catch (error) {
        console.error("Failed to fetch trending media:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user, getHistoryList]);

  return (
    <div className="pt-8">
      <header className="px-4 md:px-6 lg:px-8 mb-8">
        <h1 className="text-4xl font-black tracking-tighter text-white">
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">Animaid</span>
        </h1>
        <p className="text-gray-400 mt-1">
          {user ? `Bienvenido de nuevo, ${user.username}` : 'Descubre tu próximo anime favorito.'}
        </p>
      </header>

      {user && !isLoading && <LastWatchedCard list={userHistory} onMediaSelect={onMediaSelect} />}

      <MediaRow title="Tendencias del Momento" mediaList={trending} isLoading={isLoading} onMediaSelect={onMediaSelect} />
      <MediaRow title="Anime Popular" mediaList={popularAnime} isLoading={isLoading} onMediaSelect={onMediaSelect} />
      <MediaRow title="Manga Popular" mediaList={popularManga} isLoading={isLoading} onMediaSelect={onMediaSelect} />
    </div>
  );
};

export default TrendingView;