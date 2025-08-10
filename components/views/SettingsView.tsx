
import React from 'react';
import { useAuth, ANILIST_CLIENT_ID } from '../../context/AuthContext';
import { ChevronRightIcon, AnilistIcon } from '../icons';

// Helper component defined in the same file
interface SettingsItemProps {
    label: string;
    value?: string;
    onClick?: () => void;
    hasArrow?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ label, value, onClick, hasArrow = true }) => (
    <button
        onClick={onClick}
        disabled={!onClick && hasArrow}
        className="w-full flex justify-between items-center bg-slate-800 p-4 rounded-lg text-left disabled:opacity-70"
    >
        <div>
            <span className="text-white font-medium">{label}</span>
        </div>
        <div className="flex items-center space-x-2">
            {value && <span className="text-slate-400">{value}</span>}
            {hasArrow && <ChevronRightIcon className="w-5 h-5 text-slate-500" />}
        </div>
    </button>
);

const SettingsView: React.FC = () => {
    const { user, logout, isLoading } = useAuth();

    const handleAnilistLogin = () => {
        // The redirect URI must be registered in your AniList API client settings.
        // Using window.location.origin makes it work for both localhost and production.
        const REDIRECT_URI = window.location.origin;
        // Switch to 'code' for the Authorization Code Grant flow, required by AniList.
        const url = `https://anilist.co/api/v2/oauth/authorize?client_id=${ANILIST_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`;
        window.location.href = url;
    };
    
    return (
        <div className="pt-6">
            <header className="px-4 mb-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-white">Ajustes</h1>
            </header>
            <div className="px-4 space-y-6">
                <section>
                    <h2 className="text-xs font-bold uppercase text-slate-400 mb-2 px-1">Cuenta de AniList</h2>
                    {isLoading ? (
                        <div className="flex items-center justify-center bg-slate-800 p-4 rounded-lg h-28">
                            <div className="w-8 h-8 border-4 border-slate-500 border-t-indigo-400 rounded-full animate-spin"></div>
                        </div>
                    ) : user ? (
                        <div className="flex items-center bg-slate-800 p-4 rounded-lg space-x-4">
                            <img src={user.avatar.large} alt={user.name} className="w-16 h-16 rounded-full"/>
                            <div>
                                <h3 className="text-xl font-bold text-white">{user.name}</h3>
                                <p className="text-slate-400">Sesión iniciada.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-800 p-4 rounded-lg">
                             <p className="text-sm text-slate-300 mb-4 text-center">
                                Sincroniza tu progreso y listas desde AniList.
                            </p>
                            <button
                                onClick={handleAnilistLogin}
                                disabled={isLoading}
                                className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                            >
                                <AnilistIcon className="w-6 h-6" />
                                <span>Conectar con AniList</span>
                            </button>
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="text-xs font-bold uppercase text-slate-400 mb-2 px-1">Preferencias</h2>
                    <div className="space-y-2">
                        <SettingsItem label="Apariencia" value="Oscuro" />
                        <SettingsItem label="Notificaciones" />
                        <SettingsItem label="Calidad de video" value="Auto" />
                    </div>
                </section>
                
                <section>
                     <h2 className="text-xs font-bold uppercase text-slate-400 mb-2 px-1">Acerca de</h2>
                    <div className="space-y-2">
                        <SettingsItem label="Política de Privacidad" />
                        <SettingsItem label="Términos de Servicio" />
                        <SettingsItem label="Versión" value="1.1.0" hasArrow={false} />
                    </div>
                </section>

                {user && (
                    <section>
                        <button
                            onClick={logout}
                            className="w-full bg-red-600/20 text-red-400 font-bold py-3 px-4 rounded-lg hover:bg-red-600/30 transition-colors"
                        >
                            Cerrar Sesión
                        </button>
                    </section>
                )}
            </div>
        </div>
    );
};

export default SettingsView;