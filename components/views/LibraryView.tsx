
import React, { useState, useEffect } from 'react';
import { Media, MediaList } from '../../types';
import { getUserList } from '../../services/anilistService';
import Spinner from '../Spinner';
import { useAuth } from '../../context/AuthContext';

// Helper component defined in the same file
interface LibraryListItemProps {
    item: MediaList;
    onClick: () => void;
}

const LibraryListItem: React.FC<LibraryListItemProps> = ({ item, onClick }) => (
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
            <div className="w-full bg-slate-700 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                    className="bg-indigo-500 h-1.5 rounded-full" 
                    style={{ width: `${(item.progress / (item.media.episodes || item.media.chapters || 100)) * 100}%` }}
                ></div>
            </div>
        </div>
    </button>
);


const LibraryView: React.FC<{ onMediaSelect: (media: Media) => void }> = ({ onMediaSelect }) => {
    const [userList, setUserList] = useState<MediaList[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, token, isLoading: isAuthLoading } = useAuth();

    useEffect(() => {
        if (user && token) {
            const fetchData = async () => {
                setIsLoading(true);
                try {
                    const data = await getUserList(user.id, token);
                    setUserList(data);
                } catch (error) {
                    console.error("Failed to fetch user list:", error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchData();
        } else if (!isAuthLoading) {
            setIsLoading(false);
            setUserList([]);
        }
    }, [user, token, isAuthLoading]);

    if (isAuthLoading || (isLoading && user)) {
        return (
             <div className="pt-6">
                <header className="px-4 mb-6">
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">Mi Lista</h1>
                </header>
                <Spinner />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="pt-6 text-center">
                 <header className="px-4 mb-6">
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">Mi Lista</h1>
                 </header>
                <p className="text-slate-400 mt-8">Inicia sesión para ver tu lista.</p>
            </div>
        )
    }

    return (
        <div className="pt-6">
            <header className="px-4 mb-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-white">Mi Lista</h1>
                <p className="text-slate-400 mt-1">Tu progreso de anime y manga.</p>
            </header>
            <div className="px-4">
                {userList.length > 0 ? (
                    userList.map(item => <LibraryListItem key={`${item.media.id}-${item.media.format}`} item={item} onClick={() => onMediaSelect(item.media)} />)
                ) : (
                    <p className="text-slate-400 text-center py-8">Tu lista está vacía o aún no se ha cargado.</p>
                )}
            </div>
        </div>
    );
};

export default LibraryView;
