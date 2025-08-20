import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Media, MediaListStatus, MediaFormat, MediaStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeftIcon, PlayIcon, StarIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpDownIcon } from '../icons';
import Spinner from '../Spinner';

interface MediaDetailViewProps {
  media: Media;
  onClose: () => void;
  onStartPlayback: (media: Media, unit: number) => void;
  onStatusChange: (status: MediaListStatus) => void;
}

const MediaInfoItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="text-center">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-white mt-1">{value}</p>
    </div>
);

const STATUS_OPTIONS: { key: MediaListStatus, label: string }[] = [
    { key: MediaListStatus.CURRENT, label: "Viendo" },
    { key: MediaListStatus.COMPLETED, label: "Completado" },
    { key: MediaListStatus.PLANNING, label: "Planeando" },
    { key: MediaListStatus.PAUSED, label: "Pausado" },
    { key: MediaListStatus.REPEATING, label: "Repitiendo" },
    { key: MediaListStatus.DROPPED, label: "Abandonado" },
];

const StatusSelector: React.FC<{
    currentStatus: MediaListStatus;
    onStatusChange: (status: MediaListStatus) => void;
}> = ({ currentStatus, onStatusChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const currentOption = STATUS_OPTIONS.find(opt => opt.key === currentStatus);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div ref={wrapperRef} className="relative w-40 h-full">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-full w-full flex items-center justify-between bg-gray-700/80 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <span>{currentOption?.label || 'Estado'}</span>
                <ChevronUpDownIcon className="w-5 h-5 text-gray-400" />
            </button>
            {isOpen && (
                <div className="absolute bottom-full mb-2 w-full bg-gray-800 rounded-lg shadow-2xl z-20 overflow-hidden border border-gray-700 animate-fade-in">
                    <div className="flex flex-col">
                        {STATUS_OPTIONS.map(opt => (
                            <button
                                key={opt.key}
                                onClick={() => {
                                    onStatusChange(opt.key);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors duration-150 ${
                                    opt.key === currentStatus
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-gray-300 hover:bg-indigo-500/40'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const generatePagination = (currentPage: number, totalPages: number): (number | '...')[] => {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
        return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
        return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
};

const Pagination: React.FC<{
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
    const paginationItems = generatePagination(currentPage, totalPages);

    return (
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-4">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Página anterior"
            >
                <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1 sm:gap-2">
                {paginationItems.map((item, index) => {
                    if (item === '...') {
                        return (
                            <span key={`dots-${index}`} className="flex items-center justify-center w-9 h-9 text-sm font-bold text-gray-500">
                                ...
                            </span>
                        );
                    }
                    const isActive = item === currentPage;
                    return (
                        <button
                            key={item}
                            onClick={() => onPageChange(item)}
                            className={`w-9 h-9 text-sm font-bold rounded-lg transition-all duration-200 flex items-center justify-center ${
                                isActive
                                    ? 'bg-indigo-600 text-white shadow-md scale-110'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:scale-105'
                            }`}
                        >
                            {item}
                        </button>
                    );
                })}
            </div>
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Siguiente página"
            >
                <ChevronRightIcon className="w-5 h-5" />
            </button>
        </div>
    );
};

const MediaDetailView: React.FC<MediaDetailViewProps> = ({ media, onClose, onStartPlayback, onStatusChange }) => {
    const { user } = useAuth();
    const [isBannerLoaded, setIsBannerLoaded] = useState(false);
    
    const [unitListPage, setUnitListPage] = useState(1);
    const UNITS_PER_PAGE = 100;

    const isManga = useMemo(() => 
        media.format === MediaFormat.MANGA || 
        media.format === MediaFormat.NOVEL || 
        media.format === MediaFormat.ONE_SHOT, 
    [media.format]);

    const unitLabel = isManga ? 'Cap.' : 'Ep.';
    const definitiveTotalUnits = isManga ? media.chapters : media.episodes;

    const renderableTotalUnits = useMemo(() => {
        if (definitiveTotalUnits) {
            return definitiveTotalUnits;
        }
        if (media.status === MediaStatus.RELEASING && media.nextAiringEpisode) {
            return media.nextAiringEpisode.episode - 1;
        }
        return 0;
    }, [definitiveTotalUnits, media.status, media.nextAiringEpisode]);

    useEffect(() => {
        if (renderableTotalUnits && media.userProgress) {
            const progress = media.userProgress.progress;
            if (progress > 0) {
                const initialPage = Math.ceil(progress / UNITS_PER_PAGE);
                setUnitListPage(initialPage);
            }
        } else {
            setUnitListPage(1);
        }
    }, [media.userProgress, renderableTotalUnits]);
    
    const renderPlaybackButton = () => {
        const nextUnit = (media.userProgress?.progress || 0) + 1;
        const buttonText = media.userProgress && media.userProgress.progress > 0 
            ? `Continuar: ${unitLabel} ${nextUnit}` 
            : `Empezar a ver`;

        return (
             <button onClick={() => onStartPlayback(media, nextUnit)} className="flex-grow flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/30">
                <PlayIcon className="w-5 h-5"/>
                <span>{buttonText}</span>
            </button>
        )
    };

    const renderStatusControls = () => {
        if (!media.userProgress) {
            return (
                 <button 
                    onClick={() => onStatusChange(MediaListStatus.PLANNING)} 
                    className="h-full w-12 flex items-center justify-center bg-gray-700/80 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    aria-label="Añadir a Mi Lista"
                 >
                    <PlusIcon className="w-6 h-6"/>
                </button>
            )
        }

        return (
            <StatusSelector 
                currentStatus={media.userProgress.status}
                onStatusChange={onStatusChange}
            />
        )
    };

    const renderUnitList = () => {
        if (!renderableTotalUnits || renderableTotalUnits === 0) return null;
        
        const progress = media.userProgress?.progress || 0;
        const pageCount = Math.ceil(renderableTotalUnits / UNITS_PER_PAGE);
        const startUnit = (unitListPage - 1) * UNITS_PER_PAGE + 1;
        const endUnit = Math.min(unitListPage * UNITS_PER_PAGE, renderableTotalUnits);
        const unitsToShow = Array.from({ length: endUnit - startUnit + 1 }, (_, i) => startUnit + i);

        return (
            <section className="mt-8">
                <h3 className="text-xl font-bold text-white mb-4">
                    {isManga ? 'Capítulos' : 'Episodios'}
                    <span className="text-gray-400 font-medium text-base ml-2">({progress} / {definitiveTotalUnits || '?'})</span>
                </h3>

                {pageCount > 1 && (
                    <Pagination currentPage={unitListPage} totalPages={pageCount} onPageChange={setUnitListPage} />
                )}
                
                <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                    {unitsToShow.map(unit => {
                        const isWatched = unit <= progress;
                        const isNext = unit === progress + 1;
                        return (
                            <button 
                                key={unit} 
                                onClick={() => onStartPlayback(media, unit)}
                                className={`aspect-square rounded-lg font-bold text-sm flex items-center justify-center transition-all duration-200 border-2
                                ${isNext ? 'bg-indigo-600 border-indigo-500 text-white animate-pulse' : ''}
                                ${isWatched ? 'bg-indigo-500/20 border-indigo-500/30 text-gray-300' : 'bg-gray-800/70 border-gray-700/80 hover:bg-gray-700 hover:border-gray-600'}`}
                            >
                                {unit}
                            </button>
                        )
                    })}
                </div>
            </section>
        );
    }
    
    return (
        <div className="min-h-screen bg-gray-950 text-white animate-fade-in">
            <div className="relative h-60 md:h-72 lg:h-80 w-full overflow-hidden">
                <div className="absolute inset-0" style={{ backgroundColor: media.coverImage.color || '#181820' }}></div>
                <img 
                    src={media.bannerImage || media.coverImage.extraLarge} 
                    alt="" 
                    className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ${isBannerLoaded ? 'opacity-40' : 'opacity-0'}`}
                    onLoad={() => setIsBannerLoaded(true)}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/60 to-transparent"></div>
                <header className="absolute top-0 left-0 right-0 p-4 z-10 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
                    <button onClick={onClose} className="p-2 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-colors" aria-label="Volver">
                        <ArrowLeftIcon className="w-6 h-6" />
                    </button>
                    <h1 className="text-3xl font-black tracking-tighter text-white">
                        <span className="animated-gradient">Animaid</span>
                    </h1>
                    <div className="w-10 h-10 flex-shrink-0" />
                </header>
            </div>

            <main className="p-4 md:p-6 lg:p-8 -mt-28 md:-mt-36 relative z-10">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0 w-36 sm:w-48 mx-auto md:mx-0">
                        <img src={media.coverImage.extraLarge} alt={media.title.romaji} className="w-full h-auto rounded-lg shadow-2xl aspect-[2/3]" />
                    </div>
                    <div className="flex-grow pt-4 text-center md:text-left">
                        <h1 className="text-2xl lg:text-3xl font-black tracking-tight">{media.title.english || media.title.romaji}</h1>
                        <h2 className="text-lg text-gray-400 font-medium">{media.title.native}</h2>
                        <div className="flex flex-wrap gap-2 my-4 justify-center md:justify-start">
                            {media.genres.slice(0, 4).map(genre => (
                                <span key={genre} className="bg-gray-800 text-gray-300 text-xs font-semibold px-2.5 py-1 rounded-full">{genre}</span>
                            ))}
                        </div>
                         <div className="flex items-stretch gap-2 mt-4">
                            {renderPlaybackButton()}
                            {user && <div className="flex-shrink-0 h-12">{renderStatusControls()}</div>}
                        </div>
                    </div>
                </div>

                <section className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-900/50 rounded-xl p-4 my-8">
                    <MediaInfoItem label="Formato" value={media.format?.replace(/_/g, ' ') || 'N/A'} />
                    <MediaInfoItem label="Unidades" value={definitiveTotalUnits || '?'} />
                    <MediaInfoItem label="Estado" value={media.status?.replace(/_/g, ' ') || 'N/A'} />
                    <MediaInfoItem label="Puntuación" value={
                        <span className="flex items-center justify-center gap-1.5">
                            <StarIcon className="w-5 h-5 text-yellow-400"/>
                            {media.averageScore ? (media.averageScore / 10).toFixed(1) : 'N/A'}
                        </span>
                    } />
                </section>

                <section className="prose prose-invert max-w-none text-gray-300">
                    <h3 className="text-xl font-bold text-white">Sinopsis</h3>
                    <p className="text-sm md:text-base" dangerouslySetInnerHTML={{ __html: media.description?.replace(/\n/g, '<br />') || 'No hay sinopsis disponible.' }} />
                </section>
                
                {renderUnitList()}
            </main>
        </div>
    );
};

export default MediaDetailView;