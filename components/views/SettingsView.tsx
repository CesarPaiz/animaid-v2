import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChevronRightIcon, UserCircleIcon } from '../icons';
import Spinner from '../Spinner';

// Utility to create a SHA-256 hash of a string.
async function sha256(str: string): Promise<string> {
    const textAsBuffer = new TextEncoder().encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', textAsBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hash;
}

// Pre-calculated hash for the special debug user.
const DEBUG_USER_EMAIL_HASH = 'f163b2f5c22279f61203a9876277b0662b6a22f42d250c65551b94b46c6da669'; // sha256('kekugp@gmail.com')

const ToggleSwitch: React.FC<{ enabled: boolean; onChange: () => void }> = ({ enabled, onChange }) => (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 focus:ring-offset-gray-900 ${
        enabled ? 'bg-indigo-600' : 'bg-gray-700'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
);


interface SettingsItemProps {
    label: string;
    value?: string | React.ReactNode;
    onClick?: () => void;
    hasArrow?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({ label, value, onClick, hasArrow = true }) => {
    const isButton = !!onClick;
    const Component = isButton ? 'button' : 'div';
    
    return (
        <Component
            onClick={onClick}
            disabled={!isButton}
            className="w-full flex justify-between items-center p-4 text-left disabled:opacity-70 transition-colors hover:bg-gray-800/50"
        >
            <span className="text-white font-medium">{label}</span>
            <div className="flex items-center space-x-2">
                {value && typeof value === 'string' ? <span className="text-gray-400">{value}</span> : value}
                {hasArrow && isButton && <ChevronRightIcon className="w-5 h-5 text-gray-500" />}
            </div>
        </Component>
    )
};

const SettingsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section>
        <h2 className="text-xs font-bold uppercase text-gray-500 mb-2 px-2">{title}</h2>
        <div className="bg-gray-900 rounded-xl overflow-hidden">
            {children}
        </div>
    </section>
);

const SettingsView: React.FC = () => {
    const { user, signOut, isDebugMode, toggleDebugMode, showNsfw, toggleShowNsfw } = useAuth();
    const [showDebugToggle, setShowDebugToggle] = useState(false);
    
    useEffect(() => {
        const checkDebugAccess = async () => {
            if (user?.email) {
                const userEmailHash = await sha256(user.email);
                if (userEmailHash === DEBUG_USER_EMAIL_HASH) {
                    setShowDebugToggle(true);
                } else {
                    setShowDebugToggle(false);
                }
            }
        };
        checkDebugAccess();
    }, [user]);

    if (!user) {
        return <Spinner />; // Should not happen with the new App structure, but as a fallback.
    }

    return (
        <div className="pt-8">
            <header className="px-4 md:px-6 lg:px-8 mb-8">
                <h1 className="text-4xl font-black tracking-tighter text-white"><span className="animated-gradient">Animaid</span></h1>
                <p className="text-gray-400 mt-1">Gestiona tu cuenta y preferencias.</p>
            </header>
            <div className="px-4 md:px-6 lg:px-8 max-w-3xl mx-auto space-y-8">
                <SettingsSection title="Cuenta">
                    <div className="flex items-center p-4 space-x-4">
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.username} className="w-16 h-16 rounded-full"/>
                        ) : (
                            <UserCircleIcon className="w-16 h-16 rounded-full text-gray-600" />
                        )}
                        <div>
                            <h3 className="text-xl font-bold text-white">{user.username}</h3>
                            <p className="text-gray-400">{user.email}</p>
                        </div>
                    </div>
                </SettingsSection>

                <SettingsSection title="Preferencias">
                    <div className="divide-y divide-gray-800">
                        <SettingsItem label="Apariencia" value="Oscuro" hasArrow={false} />
                         <SettingsItem
                            label="Mostrar contenido +18"
                            hasArrow={false}
                            value={<ToggleSwitch enabled={showNsfw} onChange={toggleShowNsfw} />}
                        />
                        {showDebugToggle && (
                            <SettingsItem
                                label="Modo de Depuración"
                                hasArrow={false}
                                value={<ToggleSwitch enabled={isDebugMode} onChange={toggleDebugMode} />}
                            />
                        )}
                    </div>
                </SettingsSection>
                
                <SettingsSection title="Acerca de">
                     <SettingsItem label="Versión" value="1.4.0" hasArrow={false} />
                </SettingsSection>

                <section>
                    <button
                        onClick={signOut}
                        className="w-full bg-red-500/10 text-red-400 font-bold py-3 px-4 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                        Cerrar Sesión
                    </button>
                </section>
            </div>
        </div>
    );
};

export default SettingsView;