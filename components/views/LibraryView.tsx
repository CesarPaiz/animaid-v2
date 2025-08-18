import React, { useState, useEffect, useMemo } from 'react';
import { Media, MediaList, MediaListStatus } from '../../types';
import Spinner from '../Spinner';
import { useAuth } from '../../context/AuthContext';
import { LibraryIcon } from '../icons';

interface LibraryListItemProps {
    item: MediaList;
    onClick: () => void;
}

const LibraryListItem: React.FC<LibraryListItemProps> = ({ item, onClick }) => {
    const total = item.media.episodes || item.media.chapters || 1;
    const progressPercentage = total > 0 ? (item.progress / total) * 100 : 0;
    
    return (
        <button onClick={onClick} className="flex w-full items-center bg-gray-900 p-3 rounded-xl shadow-md mb-3 text-left transition-all duration-200 hover:bg-gray-800/60 hover:scale-[1.02]">
            <img 
                src={item.media.coverImage.large || item.media.coverImage.extraLarge}
                alt={item.media.title.romaji}
                className="w-16 h-24 object-cover rounded-lg flex-shrink-0 shadow-lg"
            />
            <div className="ml-4 flex-1 overflow-hidden">
                <h3 className="font-bold text-white leading-tight truncate">{item.media.title.english || item.media.title.romaji}</h3>
                <p className="text-sm text-gray-400 mt-1">
                    Progreso: {item.progress} / {item.media.episodes || item.media.chapters || '?'}
                </p>
                <div className="w-full bg-gray-700/50 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div 
                        className="bg-indigo-500 h-1.5 rounded-full" 
                        style={{ width: `${progressPercentage}%` }}
                    ></div>
                </div>
            </div>
        </button>
    );
}

const STATUS_TABS_ORDERED: { key: MediaListStatus; label: string }[] = [
    { key: MediaListStatus.CURRENT, label: "Viendo" },
    { key: MediaListStatus.COMPLETED, label: "Completado" },
    { key: MediaListStatus.PLANNING, label: "Planeando" },
    { key: MediaListStatus.PAUSED, label: "Pausado" },
    { key: MediaListStatus.REPEATING, label: "Repitiendo" },
];

const LibraryView: React.FC<{ onMediaSelect: (media: Media) => void }> = ({ onMediaSelect }) => {
    const [fullList, setFullList] = useState<MediaList[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<MediaListStatus>(MediaListStatus.CURRENT);
    const { getFullLibraryList } = useAuth();

    useEffect(() => {
        setIsLoading(true);
        getFullLibraryList()
            .then(data => {
                setFullList(data);
            })
            .catch(error => {
                console.error("Failed to fetch full user list:", error);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [getFullLibraryList]);

    const displayedList = useMemo(() => {
        return fullList.filter(item => item.status === activeFilter);
    }, [fullList, activeFilter]);
    
    const renderEmptyState = () => (
        <div className="text-center py-16 px-4">
            <LibraryIcon className="w-16 h-16 mx-auto text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-white">Lista Vacía</h3>
            <p className="text-gray-500 mt-2">
                {isLoading ? '' : `No tienes nada en tu lista de "${STATUS_TABS_ORDERED.find(t=>t.key === activeFilter)?.label}".`}
            </p>
        </div>
    );

    if (isLoading) {
        return (
             <div className="pt-8 md:px-6 lg:px-8">
                <header className="px-4 md:px-0 mb-6">
                    <h1 className="text-4xl font-black tracking-tighter text-white"><span className="animated-gradient">Animaid</span></h1>
                    <p className="text-gray-400 mt-1">Cargando tu lista...</p>
                </header>
                <Spinner />
            </div>
        )
    }

    return (
        <div className="pt-8 md:px-6 lg:px-8">
            <header className="px-4 md:px-0 mb-6">
                <h1 className="text-4xl font-black tracking-tighter text-white"><span className="animated-gradient">Animaid</span></h1>
                <p className="text-gray-400 mt-1">Tu progreso de anime y manga, organizado.</p>
            </header>

            <div className="px-4 md:px-0 mb-4 sticky top-0 bg-gray-950/80 backdrop-blur-lg py-2 z-10">
                <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                    {STATUS_TABS_ORDERED.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveFilter(tab.key)}
                            className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-colors duration-200 ${
                                activeFilter === tab.key 
                                ? 'bg-indigo-600 text-white shadow-md' 
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 md:px-0">
                {displayedList.length > 0 ? (
                    displayedList.map(item => <LibraryListItem key={`${item.media.id}-${item.media.format}`} item={item} onClick={() => onMediaSelect(item.media)} />)
                ) : (
                    renderEmptyState()
                )}
            </div>
        </div>
    );
};

export default LibraryView;