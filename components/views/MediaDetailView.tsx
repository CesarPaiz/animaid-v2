import React, { useState, useEffect, useMemo } from 'react';
import { Media, MediaFormat } from '../../types';
import { getMediaDetails } from '../../services/anilistService';
import Spinner from '../Spinner';
import { ArrowLeftIcon, StarIcon, PlayIcon, BookOpenIcon } from '../icons';
import { useAuth } from '../../context/AuthContext';

interface MediaDetailViewProps {
  media: Media;
  onClose: () => void;
  onStartPlayback: (media: Media, unit: number) => void;
}

const EpisodeListItem: React.FC<{
  unitNumber: number;
  isWatched: boolean;
  isNext: boolean;
  isManga: boolean;
  onClick: () => void;
}> = ({ unitNumber, isWatched, isNext, isManga, onClick }) => {
    const baseClasses = "aspect-square w-full flex items-center justify-center rounded-lg transition-all duration-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900";
    
    let stateClasses = "";
    if (isNext) {
        stateClasses = "bg-indigo-600 text-white ring-indigo-500 scale-105 shadow-lg";
    } else if (isWatched) {
        stateClasses = "bg-slate-700/50 text-slate-400 hover:bg-slate-700";
    } else {
        stateClasses = "bg-slate-800/70 text-slate-200 hover:bg-slate-700";
    }

    return (
        <button
            onClick={onClick}
            className={`${baseClasses} ${stateClasses}`}
            aria-label={`${isManga ? 'Capítulo' : 'Episodio'} ${unitNumber}`}
        >
            {unitNumber}
        </button>
    );
};

const EpisodeList: React.FC<{ 
    media: Media,
    onStartPlayback: (unit: number) => void;
}> = ({ media, onStartPlayback }) => {
    const isManga = media.format === MediaFormat.MANGA || media.format === MediaFormat.NOVEL || media.format === MediaFormat.ONE_SHOT;
    const totalUnits = (isManga ? media.chapters : media.episodes) || 0;
    const userProgress = media.userProgress?.progress || 0;

    if (totalUnits === 0) return null;
    
    // Limit rendered units for performance on extremely long series
    const unitsToRender = Math.min(totalUnits, 300);
    const units = Array.from({ length: unitsToRender }, (_, i) => i + 1);

    return (
        <section>
            <h2 className="text-xl font-bold mb-3">
                {isManga ? 'Capítulos' : 'Episodios'}
            </h2>
            <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 gap-2 max-h-[22rem] overflow-y-auto p-2 bg-slate-800/40 rounded-xl">
                {units.map(unit => (
                    <EpisodeListItem
                        key={unit}
                        unitNumber={unit}
                        isWatched={unit <= userProgress}
                        isNext={unit === userProgress + 1}
                        isManga={isManga}
                        onClick={() => onStartPlayback(unit)}
                    />
                ))}
            </div>
             {totalUnits > unitsToRender && (
                <p className="text-xs text-slate-500 text-center mt-2">
                    Mostrando los primeros {unitsToRender} de {totalUnits}.
                </p>
            )}
        </section>
    );
};

const MediaDetailView: React.FC<MediaDetailViewProps> = ({ media: initialMedia, onClose, onStartPlayback }) => {
  const [media, setMedia] = useState<Media | null>(initialMedia);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const detailedMedia = await getMediaDetails(initialMedia.id, initialMedia.format, token);
        setMedia(detailedMedia);
      } catch (error) {
        console.error("Failed to fetch media details:", error);
        setMedia(initialMedia); // Fallback to initial data
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetails();
  }, [initialMedia, token]);
  
  // Use a memoized version for rendering to avoid re-renders if the object reference changes but content is the same
  const displayMedia = useMemo(() => media, [media]);


  if (isLoading || !displayMedia) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex justify-center items-center z-[100]">
        <Spinner />
      </div>
    );
  }

  const isManga = displayMedia.format === MediaFormat.MANGA || displayMedia.format === MediaFormat.NOVEL || displayMedia.format === MediaFormat.ONE_SHOT;
  const title = displayMedia.title.english || displayMedia.title.romaji;
  const totalCount = isManga ? displayMedia.chapters : displayMedia.episodes;
  const nextUnit = (displayMedia.userProgress?.progress || 0) + 1;
  
  return (
    <div className="fixed inset-0 bg-slate-900 z-[60] animate-fade-in overflow-y-auto scrollbar-hide">
      <div className="relative">
        <div className="absolute top-0 left-0 w-full h-64 md:h-80">
          <img
            src={displayMedia.coverImage.extraLarge}
            alt=""
            className="w-full h-full object-cover opacity-20"
            style={{ maskImage: 'linear-gradient(to bottom, white 50%, transparent 100%)' }}
          />
        </div>
        
        <button
          onClick={onClose}
          className="absolute top-4 left-4 bg-slate-900/50 p-2 rounded-full text-white backdrop-blur-sm z-10"
          aria-label="Volver"
        >
          <ArrowLeftIcon className="w-6 h-6" />
        </button>

        <div className="relative pt-24 px-4 pb-8">
            <header className="flex flex-col sm:flex-row items-center sm:items-end gap-4 mb-6">
              <div className="w-32 h-48 md:w-40 md:h-60 flex-shrink-0 rounded-lg shadow-2xl overflow-hidden">
                <img
                  src={displayMedia.coverImage.large}
                  alt={`Cover of ${title}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-grow text-center sm:text-left">
                <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">{title}</h1>
                <div className="flex items-center justify-center sm:justify-start gap-3 mt-2 text-sm text-slate-300 flex-wrap">
                    {displayMedia.averageScore && (
                        <div className="flex items-center gap-1">
                            <StarIcon className="w-4 h-4 text-yellow-400"/>
                            <span>{displayMedia.averageScore}%</span>
                        </div>
                    )}
                    {displayMedia.format && <span className="capitalize">{displayMedia.format.replace(/_/g, ' ').toLowerCase()}</span>}
                    {displayMedia.status && <span className="capitalize">{displayMedia.status.replace(/_/g, ' ').toLowerCase()}</span>}
                </div>
              </div>
            </header>

             <div className="my-6">
                <button 
                  onClick={() => onStartPlayback(displayMedia, nextUnit)}
                  className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-500 transition-colors shadow-lg"
                >
                    {isManga ? <BookOpenIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}
                    <span>
                        {displayMedia.userProgress && displayMedia.userProgress.progress > 0 
                            ? `Continuar ${isManga ? 'Cap.' : 'Ep.'} ${nextUnit}`
                            : `Empezar a ${isManga ? 'Leer' : 'Ver'}`
                        }
                    </span>
                </button>
            </div>

            <section className="mb-6">
                <p 
                    className="text-slate-300 text-sm prose prose-sm prose-invert"
                >{displayMedia.description}</p>
            </section>
            
            <section className="mb-6">
                <div className="flex justify-between items-center text-sm text-slate-400 mb-3">
                    <span className="font-semibold">Géneros</span>
                    {totalCount && <span>{isManga ? 'Capítulos' : 'Episodios'}: {totalCount}</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                    {displayMedia.genres.map(genre => (
                        <span key={genre} className="bg-slate-800 text-slate-300 text-xs font-medium px-3 py-1 rounded-full">
                            {genre}
                        </span>
                    ))}
                </div>
            </section>

            <EpisodeList media={displayMedia} onStartPlayback={(unit) => onStartPlayback(displayMedia, unit)} />
        </div>
      </div>
    </div>
  );
};

export default MediaDetailView;