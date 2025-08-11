import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChevronRightIcon, UserCircleIcon } from '../icons';
import Spinner from '../Spinner';

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


const LoginPrompt: React.FC = () => {
    const { signIn, authStatus } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) return;
        signIn(email, password);
    };

    return (
        <div className="bg-gray-900 p-6 rounded-xl">
            <h3 className="text-lg font-semibold text-white mb-2 text-center">Acceso Personal</h3>
            <p className="text-gray-400 mb-6 text-center text-sm">Inicia sesión para acceder a tu contenido.</p>
            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label htmlFor="email" className="sr-only">Email</label>
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-gray-800 border-2 border-gray-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div>
                    <label htmlFor="password" className="sr-only">Contraseña</label>
                    <input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-gray-800 border-2 border-gray-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <button
                    type="submit"
                    disabled={authStatus.isLoading}
                    className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-500 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                    {authStatus.isLoading ? <div className="w-5 h-5 border-2 border-gray-300 border-t-white rounded-full animate-spin"></div> : 'Iniciar Sesión'}
                </button>
            </form>
        </div>
    );
};


const SettingsView: React.FC = () => {
    const { user, signOut, authStatus, isDebugMode, toggleDebugMode } = useAuth();

    return (
        <div className="pt-8">
            <header className="px-4 md:px-6 mb-8">
                <h1 className="text-4xl font-black tracking-tighter text-white">Ajustes</h1>
            </header>
            <div className="px-4 md:px-6 space-y-8">
                <SettingsSection title="Cuenta">
                    {authStatus.isLoading && !user ? (
                         <div className="flex items-center justify-center h-48">
                            <Spinner/>
                        </div>
                    ) : user ? (
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
                    ) : (
                        <LoginPrompt />
                    )}
                </SettingsSection>

                <SettingsSection title="Preferencias">
                    <div className="divide-y divide-gray-800">
                        <SettingsItem label="Apariencia" value="Oscuro" hasArrow={false} />
                        <SettingsItem label="Notificaciones" onClick={() => {}}/>
                        <SettingsItem label="Calidad de video" value="Auto" onClick={() => {}}/>
                        {user && (
                            <SettingsItem
                                label="Modo de Depuración"
                                hasArrow={false}
                                value={<ToggleSwitch enabled={isDebugMode} onChange={toggleDebugMode} />}
                            />
                        )}
                    </div>
                </SettingsSection>
                
                <SettingsSection title="Acerca de">
                    <div className="divide-y divide-gray-800">
                        <SettingsItem label="Política de Privacidad" onClick={() => {}}/>
                        <SettingsItem label="Términos de Servicio" onClick={() => {}}/>
                        <SettingsItem label="Versión" value="1.3.0" hasArrow={false} />
                    </div>
                </SettingsSection>

                {user && (
                    <section>
                        <button
                            onClick={signOut}
                            className="w-full bg-red-500/10 text-red-400 font-bold py-3 px-4 rounded-lg hover:bg-red-500/20 transition-colors"
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