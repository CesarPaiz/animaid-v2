import React, { useState, useEffect, useRef } from 'react';
import { Media, MediaList, MediaListStatus } from '../../types';
import { getTrendingAnime, getPopularAnime, getPopularManga, getTopRatedAnime } from '../../services/anilistService';
import MediaCard from '../MediaCard';
import Spinner from '../Spinner';
import { useAuth } from '../../context/AuthContext';
import { PlayIcon, ChevronLeftIcon, ChevronRightIcon } from '../icons';

// --- MOBILE/TABLET COMPONENTS (UNCHANGED) ---

const MediaRow: React.FC<{
  title: string;
  mediaList: Media[];
  isLoading: boolean;
  onMediaSelect: (media: Media) => void;
}> = ({ title, mediaList, isLoading, onMediaSelect }) => {
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
                <div ref={scrollRef} className="flex space-x-4 overflow-x-auto px-4 md:px-6 lg:px-8 pb-4 scrollbar-hide overscroll-x-contain">
                {mediaList.map(media => (
                    <div key={media.id} className="w-36 sm:w-40 md:w-48 lg:w-52 flex-shrink-0">
                    <MediaCard media={media} onClick={() => onMediaSelect(media)} />
                    </div>
                ))}
                </div>
                <button
                    onClick={() => scroll('left')}
                    aria-label="Scroll left"
                    className="absolute top-1/2 -translate-y-1/2 left-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 hover:bg-black/80 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                    <ChevronLeftIcon className="h-6 w-6" />
                </button>
                <button
                    onClick={() => scroll('right')}
                    aria-label="Scroll right"
                    className="absolute top-1/2 -translate-y-1/2 right-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white opacity-0 backdrop-blur-sm transition-all duration-300 group-hover:opacity-100 hover:bg-black/80 hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                    <ChevronRightIcon className="h-6 w-6" />
                </button>
            </div>
            )}
        </section>
    );
};

const LastWatchedCard: React.FC<{ list: MediaList[], onMediaSelect: (media: Media) => void }> = ({ list, onMediaSelect }) => {
    const continueWatchingStatuses: MediaListStatus[] = [MediaListStatus.CURRENT, MediaListStatus.REPEATING, MediaListStatus.PAUSED];
    const lastWatched = list.find(item => 
        item.progress > 0 &&
        continueWatchingStatuses.includes(item.status)
    );

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


// --- DESKTOP-ONLY COMPONENTS ---

const DesktopHero: React.FC<{ media: Media, onMediaSelect: (media: Media) => void }> = ({ media, onMediaSelect }) => (
    <section className="mb-12">
        <button onClick={() => onMediaSelect(media)} className="w-full aspect-[21/9] rounded-2xl overflow-hidden relative group block shadow-2xl shadow-indigo-900/20">
            <img src={media.bannerImage || media.coverImage.extraLarge} alt="" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out"/>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6">
                <h2 className="text-3xl font-black text-white drop-shadow-lg">{media.title.english || media.title.romaji}</h2>
                <p className="text-gray-300 mt-1 line-clamp-2 text-sm max-w-2xl drop-shadow-md" dangerouslySetInnerHTML={{ __html: media.description }} />
            </div>
        </button>
    </section>
);

const DesktopMediaGrid: React.FC<{ title: string, mediaList: Media[], onMediaSelect: (media: Media) => void }> = ({ title, mediaList, onMediaSelect }) => (
    <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-100 mb-4">{title}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {mediaList.map(media => (
                <MediaCard key={media.id} media={media} onClick={() => onMediaSelect(media)} />
            ))}
        </div>
    </section>
);

const DesktopLastWatched: React.FC<{ list: MediaList[], onMediaSelect: (media: Media) => void }> = ({ list, onMediaSelect }) => {
    const continueWatchingStatuses: MediaListStatus[] = [MediaListStatus.CURRENT, MediaListStatus.REPEATING, MediaListStatus.PAUSED];
    const lastWatched = list.find(item => item.progress > 0 && continueWatchingStatuses.includes(item.status));
    if (!lastWatched) return null;

    const { media, progress } = lastWatched;

    return (
        <div className="bg-gray-900 rounded-2xl p-4">
            <h3 className="font-bold text-lg mb-3">Continuar Viendo</h3>
            <button onClick={() => onMediaSelect(media)} className="flex items-center gap-4 w-full text-left group">
                <img src={media.coverImage.large} alt="" className="w-14 h-20 object-cover rounded-lg flex-shrink-0 group-hover:scale-105 transition-transform"/>
                <div className="flex-grow min-w-0">
                    <p className="font-semibold text-white truncate">{media.title.english || media.title.romaji}</p>
                    <p className="text-sm text-gray-400">
                        {media.format === 'MANGA' ? 'Cap. ' : 'Ep. '} {progress + 1}
                    </p>
                </div>
                <div className="p-2 bg-gray-700 rounded-full group-hover:bg-indigo-600 transition-colors">
                    <PlayIcon className="w-5 h-5"/>
                </div>
            </button>
        </div>
    );
};

const DesktopSidebarList: React.FC<{ 
  title: string; 
  mediaList: Media[]; 
  onMediaSelect: (media: Media) => void; 
  startIndex?: number; 
}> = ({ title, mediaList, onMediaSelect, startIndex }) => (
    <div className="bg-gray-900 rounded-2xl p-4">
        <h3 className="font-bold text-lg mb-3">{title}</h3>
        <div className="space-y-1">
            {mediaList.map((media, index) => (
                <button key={media.id} onClick={() => onMediaSelect(media)} className="flex items-center gap-4 w-full text-left group p-2 rounded-lg hover:bg-gray-800/60 transition-colors">
                    {startIndex !== undefined && (
                        <span className="font-bold text-xl text-gray-600 w-6 text-center">{startIndex + index}</span>
                    )}
                    <img src={media.coverImage.large} alt="" className="w-10 h-14 object-cover rounded-md flex-shrink-0"/>
                    <div className="flex-grow min-w-0">
                         <p className="font-semibold text-sm text-white truncate group-hover:text-indigo-400 transition-colors">{media.title.english || media.title.romaji}</p>
                    </div>
                </button>
            ))}
        </div>
    </div>
);


// --- MAIN VIEW COMPONENT ---

interface TrendingViewProps {
  onMediaSelect: (media: Media) => void;
  isActive: boolean;
}

const TrendingView: React.FC<TrendingViewProps> = ({ onMediaSelect, isActive }) => {
  const [trending, setTrending] = useState<Media[]>([]);
  const [popularAnime, setPopularAnime] = useState<Media[]>([]);
  const [popularManga, setPopularManga] = useState<Media[]>([]);
  const [topRatedAnime, setTopRatedAnime] = useState<Media[]>([]);
  const [fullLibrary, setFullLibrary] = useState<MediaList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, getFullLibraryList } = useAuth();

  useEffect(() => {
    if (!isActive) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [
          trendingData,
          popularAnimeData,
          popularMangaData,
          topRatedData,
          libraryData,
        ] = await Promise.all([
          getTrendingAnime(),
          getPopularAnime(),
          getPopularManga(),
          getTopRatedAnime(),
          user ? getFullLibraryList() : Promise.resolve<MediaList[]>([]),
        ]);
        
        setTrending(trendingData);
        setPopularAnime(popularAnimeData);
        setPopularManga(popularMangaData);
        setTopRatedAnime(topRatedData);
        setFullLibrary(libraryData);

      } catch (error) {
        console.error("Failed to fetch trending media:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, getFullLibraryList, isActive]);
  
  const heroItem = trending?.[0];
  const trendingListItems = trending?.slice(1, 11);
  const recommendedItems = topRatedAnime?.slice(0, 10);

  return (
    <div className="pt-8 md:pt-0">
      <header className="px-4 md:px-6 lg:px-8 mb-8 md:pt-8">
        <h1 className="text-4xl font-black tracking-tighter text-white">
          <span className="animated-gradient">Animaid</span>
        </h1>
        <p className="text-gray-400 mt-1">
          {user ? `Bienvenido de nuevo, ${user.username}` : 'Descubre tu próximo anime favorito.'}
        </p>
      </header>
      
      {/* --- MOBILE & TABLET LAYOUT --- */}
      <div className="lg:hidden">
        {user && !isLoading && fullLibrary.length > 0 && <LastWatchedCard list={fullLibrary} onMediaSelect={onMediaSelect} />}
        <MediaRow title="Tendencias del Momento" mediaList={trending} isLoading={isLoading} onMediaSelect={onMediaSelect} />
        <MediaRow title="Anime Popular" mediaList={popularAnime} isLoading={isLoading} onMediaSelect={onMediaSelect} />
        <MediaRow title="Manga Popular" mediaList={popularManga} isLoading={isLoading} onMediaSelect={onMediaSelect} />
      </div>

      {/* --- DESKTOP LAYOUT --- */}
      <div className="hidden lg:block">
        {isLoading ? <Spinner /> : (
            <div className="grid grid-cols-12 gap-8 px-4 md:px-6 lg:px-8 pb-8">
                {/* Main Content Area */}
                <div className="col-span-12 lg:col-span-9">
                    {heroItem && <DesktopHero media={heroItem} onMediaSelect={onMediaSelect} />}
                    {popularAnime.length > 0 && <DesktopMediaGrid title="Anime Popular" mediaList={popularAnime} onMediaSelect={onMediaSelect} />}
                    {popularManga.length > 0 && <DesktopMediaGrid title="Manga Popular" mediaList={popularManga} onMediaSelect={onMediaSelect} />}
                </div>

                {/* Sidebar */}
                <aside className="col-span-12 lg:col-span-3">
                    <div className="sticky top-8 space-y-6 max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-y-contain pr-2">
                        {user && fullLibrary.length > 0 && <DesktopLastWatched list={fullLibrary} onMediaSelect={onMediaSelect} />}
                        {trendingListItems && trendingListItems.length > 0 && (
                          <DesktopSidebarList 
                            title="Tendencias" 
                            mediaList={trendingListItems} 
                            onMediaSelect={onMediaSelect} 
                            startIndex={2} 
                          />
                        )}
                        {recommendedItems && recommendedItems.length > 0 && (
                          <DesktopSidebarList 
                            title="Recomendados" 
                            mediaList={recommendedItems} 
                            onMediaSelect={onMediaSelect} 
                          />
                        )}
                    </div>
                </aside>
            </div>
        )}
      </div>
    </div>
  );
};

export default TrendingView;