import React, { useState, useEffect } from 'react';
import { Media, MediaList } from '../../types';
import Spinner from '../Spinner';
import { useAuth } from '../../context/AuthContext';
import { HistoryIcon } from '../icons';

const timeAgo = (timestamp: number): string => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - (timestamp * 1000)) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return `Hace ${Math.floor(interval)} años`;
    interval = seconds / 2592000;
    if (interval > 1) return `Hace ${Math.floor(interval)} meses`;
    interval = seconds / 86400;
    if (interval > 1) return `Hace ${Math.floor(interval)} días`;
    interval = seconds / 3600;
    if (interval > 1) return `Hace ${Math.floor(interval)} horas`;
    interval = seconds / 60;
    if (interval > 1) return `Hace ${Math.floor(interval)} minutos`;
    return 'Hace un momento';
}

interface HistoryListItemProps {
    item: MediaList;
    onClick: () => void;
}

const HistoryListItem: React.FC<HistoryListItemProps> = ({ item, onClick }) => (
    <button onClick={onClick} className="group w-full bg-gray-900 rounded-xl shadow-md text-left transition-all duration-300 hover:bg-gray-800/60 hover:!scale-[1.02] overflow-hidden flex flex-row lg:flex-col active:scale-95">
        <img 
            src={item.media.coverImage.extraLarge}
            alt={item.media.title.romaji}
            className="w-24 h-36 lg:w-full lg:h-auto object-cover flex-shrink-0 lg:aspect-[2/3] transition-transform lg:group-hover:scale-105"
        />
        <div className="p-3 lg:p-4 flex flex-col justify-between flex-1">
            <div>
                <h3 className="font-bold text-white leading-tight truncate">{item.media.title.english || item.media.title.romaji}</h3>
                <p className="text-sm text-gray-400 mt-1 capitalize">
                    {item.media.format?.replace(/_/g, ' ').toLowerCase()}
                </p>
            </div>
            <div className="mt-2 lg:mt-4">
                 <p className="text-sm text-gray-300 font-semibold">
                    Visto cap./ep. {item.progress}
                </p>
                {item.updatedAt && <p className="text-xs text-gray-500 mt-1 font-medium">{timeAgo(item.updatedAt)}</p>}
            </div>
        </div>
    </button>
);


const HistoryView: React.FC<{ onMediaSelect: (media: Media) => void }> = ({ onMediaSelect }) => {
    const [userHistory, setUserHistory] = useState<MediaList[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { getHistoryList } = useAuth();

    useEffect(() => {
        setIsLoading(true);
        getHistoryList()
            .then(data => {
                setUserHistory(data);
            })
            .catch(error => {
                console.error("Failed to fetch user history:", error);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [getHistoryList]);
    
    const renderEmptyState = () => (
        <div className="text-center py-16 px-4">
            <HistoryIcon className="w-16 h-16 mx-auto text-gray-700 mb-4" />
            <h3 className="text-xl font-semibold text-white">Sin Actividad Reciente</h3>
            <p className="text-gray-500 mt-2">Tu historial de visualización aparecerá aquí.</p>
        </div>
    );

    if (isLoading) {
        return (
             <div className="pt-8 md:px-6 lg:px-8">
                <header className="px-4 md:px-0 mb-6">
                    <h1 className="text-4xl font-black tracking-tighter text-white"><span className="animated-gradient">Animaid</span></h1>
                    <p className="text-gray-400 mt-1">Cargando tu actividad reciente...</p>
                </header>
                <Spinner />
            </div>
        )
    }

    return (
        <div className="pt-8 md:px-6 lg:px-8">
            <header className="px-4 md:px-0 mb-6">
                <h1 className="text-4xl font-black tracking-tighter text-white"><span className="animated-gradient">Animaid</span></h1>
                <p className="text-gray-400 mt-1">Tu actividad más reciente.</p>
            </header>
            <div className="px-4 md:px-0">
                <div className="max-w-7xl mx-auto">
                    {userHistory.length > 0 ? (
                        <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-4">
                            {userHistory.map(item => <HistoryListItem key={`${item.media.id}-${item.media.format}`} item={item} onClick={() => onMediaSelect(item.media)} />)}
                        </div>
                    ) : (
                        renderEmptyState()
                    )}
                </div>
            </div>
        </div>
    );
};

export default HistoryView;