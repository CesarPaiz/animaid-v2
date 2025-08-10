
import React, { useState, useEffect } from 'react';
import { Media, MediaList, MediaStatus } from '../../types';
import { getTrendingAnime, getPopularAnime, getPopularManga, getUserMediaHistory } from '../../services/anilistService';
import MediaCard from '../MediaCard';
import Spinner from '../Spinner';
import { useAuth } from '../../context/AuthContext';

// Helper component defined in the same file as per the request.
interface MediaRowProps {
  title: string;
  mediaList: Media[];
  isLoading: boolean;
  onMediaSelect: (media: Media) => void;
}

const MediaRow: React.FC<MediaRowProps> = ({ title, mediaList, isLoading, onMediaSelect }) => (
  <section className="mb-8">
    <h2 className="text-xl font-bold text-slate-100 px-4 mb-3">{title}</h2>
    {isLoading && mediaList.length === 0 ? <Spinner /> : (
      <div className="relative">
        <div className="flex space-x-4 overflow-x-auto px-4 pb-4 scrollbar-hide">
          {mediaList.map(media => (
            <div key={media.id} className="w-32 md:w-40 flex-shrink-0">
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
        .sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0] || list[0];

    if (!lastWatched) return null;

    const { media, progress } = lastWatched;
    const total = media.episodes || media.chapters || 1;
    const progressPercentage = total > 0 ? (progress / total) * 100 : 0;
    
    return (
        <section className="mb-8 px-4">
            <h2 className="text-xl font-bold text-slate-100 mb-3">Continuar Viendo</h2>
            <button onClick={() => onMediaSelect(media)} className="w-full bg-slate-800 rounded-lg overflow-hidden flex items-center shadow-lg text-left transition-transform duration-300 ease-in-out active:scale-95 md:hover:scale-[1.02]">
                <img src={media.coverImage.large || media.coverImage.extraLarge} alt={media.title.romaji} className="w-20 h-full object-cover flex-shrink-0"/>
                <div className="p-3 flex-grow">
                    <h3 className="font-bold text-white truncate">{media.title.english || media.title.romaji}</h3>
                    <p className="text-sm text-slate-300">
                        {media.format === 'MANGA' ? 'Capítulo' : 'Episodio'} {progress}
                    </p>
                    <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div className="bg-indigo-500 h-1.5" style={{width: `${progressPercentage}%`}}></div>
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
  const { user, token } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const publicMediaPromises = [
          getTrendingAnime(token),
          getPopularAnime(token),
          getPopularManga(token),
        ];
        
        if (user && token) {
          const userHistoryData = await getUserMediaHistory(user.id, token);
          setUserHistory(userHistoryData);
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
  }, [user, token]);

  return (
    <div className="pt-6">
      <header className="px-4 mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Animaid
        </h1>
        <p className="text-slate-400 mt-1">
          {user ? `Bienvenido de nuevo, ${user.name}` : 'Descubre tu próximo anime favorito.'}
        </p>
      </header>

      {user && !isLoading && userHistory.length > 0 && <LastWatchedCard list={userHistory} onMediaSelect={onMediaSelect} />}

      <MediaRow title="Tendencias del momento" mediaList={trending} isLoading={isLoading} onMediaSelect={onMediaSelect} />
      <MediaRow title="Anime popular" mediaList={popularAnime} isLoading={isLoading} onMediaSelect={onMediaSelect} />
      <MediaRow title="Manga popular" mediaList={popularManga} isLoading={isLoading} onMediaSelect={onMediaSelect} />
    </div>
  );
};

export default TrendingView;