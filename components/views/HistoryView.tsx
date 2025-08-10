
import React, { useState, useEffect } from 'react';
import { Media, MediaList } from '../../types';
import { getUserMediaHistory } from '../../services/anilistService';
import Spinner from '../Spinner';
import { useAuth } from '../../context/AuthContext';

// Helper to format time relative to now
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
    <button onClick={onClick} className="flex w-full items-center bg-slate-800 p-2 rounded-lg shadow-md mb-3 text-left transition-colors hover:bg-slate-700/50">
        <img 
            src={item.media.coverImage.large || item.media.coverImage.extraLarge}
            alt={item.media.title.romaji}
            className="w-16 h-24 object-cover rounded-md flex-shrink-0"
        />
        <div className="ml-4 flex-1 overflow-hidden">
            <h3 className="font-bold text-white leading-tight truncate">{item.media.title.english || item.media.title.romaji}</h3>
            <p className="text-sm text-slate-400">
                Progreso: {item.progress} / {item.media.episodes || item.media.chapters || '?'}
            </p>
             {item.updatedAt && <p className="text-xs text-slate-500 mt-1">{timeAgo(item.updatedAt)}</p>}
        </div>
    </button>
);


const HistoryView: React.FC<{ onMediaSelect: (media: Media) => void }> = ({ onMediaSelect }) => {
    const [userHistory, setUserHistory] = useState<MediaList[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, token, isLoading: isAuthLoading } = useAuth();

    useEffect(() => {
        if (user && token) {
            const fetchData = async () => {
                setIsLoading(true);
                try {
                    const data = await getUserMediaHistory(user.id, token);
                    setUserHistory(data);
                } catch (error) {
                    console.error("Failed to fetch user history:", error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        } else if (!isAuthLoading) {
            setIsLoading(false);
            setUserHistory([]);
        }
    }, [user, token, isAuthLoading]);

    if (isAuthLoading || (isLoading && user)) {
        return (
             <div className="pt-6">
                <header className="px-4 mb-6">
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">Historial</h1>
                </header>
                <Spinner />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="pt-6 text-center">
                 <header className="px-4 mb-6">
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">Historial</h1>
                 </header>
                <p className="text-slate-400 mt-8">Inicia sesión para ver tu historial.</p>
            </div>
        )
    }

    return (
        <div className="pt-6">
            <header className="px-4 mb-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-white">Historial</h1>
                <p className="text-slate-400 mt-1">Tu actividad más reciente.</p>
            </header>
            <div className="px-4">
                {userHistory.length > 0 ? (
                    userHistory.map(item => <HistoryListItem key={`${item.media.id}-${item.media.format}`} item={item} onClick={() => onMediaSelect(item.media)} />)
                ) : (
                    <p className="text-slate-400 text-center py-8">No se ha encontrado actividad reciente.</p>
                )}
            </div>
        </div>
    );
};

export default HistoryView;