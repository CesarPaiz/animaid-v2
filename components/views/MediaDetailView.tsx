import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Media, MediaFormat, MediaListStatus, MediaStatus, NextAiringEpisode } from '../../types';
import { getMediaDetails } from '../../services/anilistService';
import Spinner from '../Spinner';
import { ArrowLeftIcon, StarIcon, PlayIcon, BookOpenIcon, CheckIconSolid, ClockIcon } from '../icons';
import { useAuth } from '../../context/AuthContext';

interface MediaDetailViewProps {
  media: Media;
  onClose: () => void;
  onStartPlayback: (media: Media, unit: number) => void;
}

const STATUS_MAP: { [key in MediaListStatus]: { label: string } } = {
    [MediaListStatus.CURRENT]: { label: 'Viendo' },
    [MediaListStatus.PLANNING]: { label: 'Planeando' },
    [MediaListStatus.COMPLETED]: { label: 'Completado' },
    [MediaListStatus.DROPPED]: { label: 'Dropeado' },
    [MediaListStatus.PAUSED]: { label: 'Pausado' },
    [MediaListStatus.REPEATING]: { label: 'Repitiendo' },
};

const AiringSchedule: React.FC<{
  status: MediaStatus;
  nextAiringEpisode?: NextAiringEpisode;
}> = ({ status, nextAiringEpisode }) => {
  if (status !== MediaStatus.RELEASING && status !== MediaStatus.NOT_YET_RELEASED) {
    return null;
  }

  const formatTime = (totalSeconds: number) => {
    const days = Math.floor(totalSeconds / 86400);
    totalSeconds %= 86400;
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);

    let parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 && days === 0) parts.push(`${minutes}m`);
    return parts.join(' ') || 'Pronto';
  };

  let content = null;
  if (status === MediaStatus.NOT_YET_RELEASED) {
    content = 'Pendiente de estreno.';
  } else if (nextAiringEpisode) {
    const timeString = formatTime(nextAiringEpisode.timeUntilAiring);
    content = `Ep. ${nextAiringEpisode.episode} se estrena en ${timeString}.`;
  } else {
    content = 'Esperando información del próximo episodio.';
  }

  return (
    <div className="bg-gray-800/60 text-indigo-300 text-sm font-semibold p-3 rounded-lg text-center my-4 flex items-center justify-center gap-2 backdrop-blur-sm">
      <ClockIcon className="w-5 h-5 flex-shrink-0" />
      <span>{content}</span>
    </div>
  );
};


const StatusSelector: React.FC<{
    currentStatus?: MediaListStatus;
    onStatusSelect: (status: MediaListStatus) => void;
}> = ({ currentStatus, onStatusSelect }) => {
    const statuses = Object.keys(STATUS_MAP) as MediaListStatus[];

    return (
        <div className="flex flex-wrap gap-2">
            {statuses.map(status => {
                const isActive = status === currentStatus;
                return (
                    <button
                        key={status}
                        onClick={() => onStatusSelect(status)}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 ease-in-out transform
                            ${isActive 
                                ? 'bg-indigo-600 text-white shadow-lg scale-105'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        {STATUS_MAP[status].label}
                    </button>
                )
            })}
        </div>
    );
}

const EpisodeListItem: React.FC<{
  unitNumber: number;
  isWatched: boolean;
  isNext: boolean;
  onClick: () => void;
}> = ({ unitNumber, isWatched, isNext, onClick }) => {
    const baseClasses = "aspect-square w-full flex items-center justify-center rounded-lg transition-all duration-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-950 relative";
    
    let stateClasses = "bg-gray-800/70 text-gray-200 hover:bg-gray-700";
    if (isWatched) {
        stateClasses = "bg-gray-800/40 text-gray-400 hover:bg-gray-700/60";
    }
    if (isNext) {
        stateClasses = "bg-indigo-600 text-white ring-indigo-500 scale-105 shadow-lg shadow-indigo-700/40 animate-[pulse_1.5s_cubic-bezier(0.4,0,0.6,1)_infinite]";
    }

    return (
        <button
            onClick={onClick}
            className={`${baseClasses} ${stateClasses}`}
            aria-label={`Episodio ${unitNumber}`}
        >
            {isNext && <PlayIcon className="w-5 h-5 absolute" />}
            <span className={isNext ? 'opacity-0' : 'opacity-100'}>{unitNumber}</span>
            {isWatched && !isNext && <CheckIconSolid className="w-4 h-4 text-green-400 absolute top-1.5 right-1.5 opacity-70" />}
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

    if (totalUnits === 0 || (totalUnits === 1 && (media.format === MediaFormat.MOVIE || media.format === MediaFormat.ONE_SHOT))) return null;
    
    const unitsToRender = Math.min(totalUnits, 300);
    const units = Array.from({ length: unitsToRender }, (_, i) => i + 1);

    return (
        <section>
            <h2 className="text-xl font-bold mb-3">
                {isManga ? 'Capítulos' : 'Episodios'}
            </h2>
            <div 
                className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 gap-2 max-h-[22rem] overflow-y-auto p-2 bg-gray-900/40 rounded-xl"
                style={{ maskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)' }}
            >
                {units.map(unit => (
                    <EpisodeListItem
                        key={unit}
                        unitNumber={unit}
                        isWatched={unit <= userProgress}
                        isNext={unit === userProgress + 1}
                        onClick={() => onStartPlayback(unit)}
                    />
                ))}
            </div>
             {totalUnits > unitsToRender && (
                <p className="text-xs text-gray-500 text-center mt-2">
                    Mostrando los primeros {unitsToRender} de {totalUnits}.
                </p>
            )}
        </section>
    );
};

const MediaDetailView: React.FC<MediaDetailViewProps> = ({ media: initialMedia, onClose, onStartPlayback }) => {
  const [media, setMedia] = useState<Media | null>(initialMedia);
  const [isLoading, setIsLoading] = useState(true);
  const { user, getMediaEntry, upsertMediaEntry } = useAuth();

  const fetchAllDetails = useCallback(async () => {
    if (!isLoading) setIsLoading(true);
    try {
      const detailedMedia = await getMediaDetails(initialMedia.id);
      if (user) {
        const userEntry = await getMediaEntry(initialMedia.id);
        if (userEntry) {
          detailedMedia.userProgress = {
            progress: userEntry.progress,
            score: userEntry.score,
            status: userEntry.status
          };
        }
      }
      setMedia(detailedMedia);
    } catch (error) {
      console.error("Failed to fetch media details:", error);
      setMedia(initialMedia);
    } finally {
      setIsLoading(false);
    }
  }, [initialMedia.id, user, getMediaEntry]);

  useEffect(() => {
    fetchAllDetails();
  }, [fetchAllDetails]);
  
  const displayMedia = useMemo(() => media, [media]);

  const handleStatusUpdate = useCallback(async (newStatus: MediaListStatus) => {
    if (!user || !displayMedia) return;

    const currentProgress = displayMedia.userProgress?.progress || 0;
    const isManga = displayMedia.format === MediaFormat.MANGA || displayMedia.format === MediaFormat.NOVEL || displayMedia.format === MediaFormat.ONE_SHOT;

    await upsertMediaEntry({
        media_id: displayMedia.id,
        progress: currentProgress,
        status: newStatus,
        media_type: isManga ? 'MANGA' : 'ANIME'
    });
    
    // Re-fetch to ensure UI is consistent with DB
    fetchAllDetails();
  }, [user, displayMedia, upsertMediaEntry, fetchAllDetails]);

  const handleStartPlaybackWithUpsert = useCallback(async (media: Media, unit: number) => {
    let mediaToPlay = media;

    if (user) {
        const isManga = media.format === MediaFormat.MANGA || media.format === MediaFormat.NOVEL || media.format === MediaFormat.ONE_SHOT;
        
        const currentStatus = media.userProgress?.status;
        let newStatus = currentStatus;
        
        const statusesThatBecomeCurrent: (MediaListStatus | undefined)[] = [
            undefined, // for new entries
            MediaListStatus.PLANNING,
            MediaListStatus.PAUSED,
            MediaListStatus.DROPPED
        ];

        if (statusesThatBecomeCurrent.includes(currentStatus)) {
            newStatus = MediaListStatus.CURRENT;
        } else if (currentStatus === MediaListStatus.COMPLETED) {
            newStatus = MediaListStatus.REPEATING;
        }
        
        if (newStatus && newStatus !== currentStatus) {
            const updatedEntry = await upsertMediaEntry({
                media_id: media.id,
                progress: media.userProgress?.progress || 0,
                status: newStatus,
                media_type: isManga ? 'MANGA' : 'ANIME'
            });

            if (updatedEntry) {
                const newMediaState = { ...media };
                newMediaState.userProgress = {
                    progress: updatedEntry.progress,
                    score: updatedEntry.score,
                    status: updatedEntry.status,
                };
                setMedia(newMediaState);
                mediaToPlay = newMediaState; 
            }
        }
    }
    onStartPlayback(mediaToPlay, unit);
  }, [user, upsertMediaEntry, onStartPlayback]);

  if (isLoading || !displayMedia) {
    return (
      <div className="fixed inset-0 bg-gray-950 flex justify-center items-center z-[100]">
        <Spinner />
      </div>
    );
  }

  const isManga = displayMedia.format === MediaFormat.MANGA || displayMedia.format === MediaFormat.NOVEL || displayMedia.format === MediaFormat.ONE_SHOT;
  const title = displayMedia.title.english || displayMedia.title.romaji;
  const totalCount = isManga ? displayMedia.chapters : displayMedia.episodes;
  const nextUnit = (displayMedia.userProgress?.progress || 0) + 1;
  const currentStatus = displayMedia.userProgress?.status;
  
  const getPlayButtonText = () => {
    if (!user) return isManga ? 'Leer Capítulo 1' : 'Ver Episodio 1';
    if (currentStatus === MediaListStatus.COMPLETED) return `Volver a ${isManga ? 'Leer' : 'Ver'}`;
    if (displayMedia.userProgress && displayMedia.userProgress.progress > 0) {
        if (isManga) {
            return totalCount && nextUnit > totalCount ? 'Leer de nuevo' : `Continuar Cap. ${nextUnit}`;
        }
        return totalCount && nextUnit > totalCount ? 'Ver de nuevo' : `Continuar Ep. ${nextUnit}`;
    }
    return `Empezar a ${isManga ? 'Leer' : 'Ver'}`;
  };
  
  const playButtonUnit = totalCount && nextUnit > totalCount ? 1 : nextUnit;

  return (
    <div className="fixed inset-0 bg-gray-950 z-[60] animate-fade-in overflow-y-auto scrollbar-hide">
      <div className="relative">
        <div className="absolute top-0 left-0 w-full h-80 md:h-96">
          <img
            src={displayMedia.coverImage.extraLarge}
            alt=""
            className="w-full h-full object-cover opacity-20"
            style={{ maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, transparent 100%)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/80 to-transparent"></div>
        </div>
        
        <button
          onClick={onClose}
          className="absolute top-5 left-4 bg-black/30 p-2 rounded-full text-white backdrop-blur-sm z-10 transition-colors hover:bg-black/50"
          aria-label="Volver"
        >
          <ArrowLeftIcon className="w-6 h-6" />
        </button>

        <div className="relative pt-28 px-4 sm:px-6 pb-8">
            <header className="flex flex-col sm:flex-row items-center sm:items-end gap-4 mb-6">
              <div className="w-32 h-48 md:w-40 md:h-60 flex-shrink-0 rounded-lg shadow-2xl overflow-hidden border-2 border-gray-800">
                <img
                  src={displayMedia.coverImage.large}
                  alt={`Cover of ${title}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-grow text-center sm:text-left">
                <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">{title}</h1>
                <div className="flex items-center justify-center sm:justify-start gap-4 mt-2 text-sm text-gray-300 flex-wrap">
                    {displayMedia.averageScore && (
                        <div className="flex items-center gap-1.5">
                            <StarIcon className="w-4 h-4 text-yellow-400"/>
                            <span className="font-semibold">{displayMedia.averageScore}%</span>
                        </div>
                    )}
                    {displayMedia.format && <span className="capitalize font-medium">{displayMedia.format.replace(/_/g, ' ').toLowerCase()}</span>}
                    {displayMedia.status && <span className="capitalize font-medium">{displayMedia.status.replace(/_/g, ' ').toLowerCase()}</span>}
                </div>
              </div>
            </header>

            <AiringSchedule status={displayMedia.status} nextAiringEpisode={displayMedia.nextAiringEpisode} />

             <div className="my-6">
                <button 
                  onClick={() => handleStartPlaybackWithUpsert(displayMedia, playButtonUnit)}
                  disabled={!user && totalCount === 0}
                  className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold py-3.5 px-4 rounded-lg hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isManga ? <BookOpenIcon className="w-6 h-6"/> : <PlayIcon className="w-6 h-6"/>}
                    <span>{getPlayButtonText()}</span>
                </button>
            </div>
            
            {user && !isLoading && (
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-gray-200 mb-3">Tu Lista</h2>
                <StatusSelector 
                  currentStatus={displayMedia.userProgress?.status}
                  onStatusSelect={handleStatusUpdate}
                />
              </section>
            )}

            <section className="mb-8">
                <p 
                    className="text-gray-300 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: displayMedia.description?.replace(/\n/g, '<br />') || '' }}
                />
            </section>
            
            <section className="mb-8">
                <h2 className="text-lg font-semibold text-gray-200 mb-3">Géneros</h2>
                <div className="flex flex-wrap gap-2">
                    {displayMedia.genres.map(genre => (
                        <span key={genre} className="bg-gray-800 text-gray-300 text-xs font-medium px-3 py-1.5 rounded-full">
                            {genre}
                        </span>
                    ))}
                </div>
            </section>

            {user && <EpisodeList media={displayMedia} onStartPlayback={(unit) => handleStartPlaybackWithUpsert(displayMedia, unit)} />}
        </div>
      </div>
    </div>
  );
};

export default MediaDetailView;