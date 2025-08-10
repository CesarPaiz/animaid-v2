
import React from 'react';
import { TrendingIcon, SearchIcon, LibraryIcon, SettingsIcon, HistoryIcon } from './icons';

type View = 'trending' | 'search' | 'library' | 'history' | 'settings';

interface BottomNavProps {
  activeView: View;
  setActiveView: (view: View) => void;
  showLibrary: boolean;
}

interface NavItemProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ label, icon, isActive, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ease-in-out focus:outline-none">
    <div className={`w-6 h-6 mb-1 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`}>
      {icon}
    </div>
    <span className={`text-xs font-medium ${isActive ? 'text-indigo-400' : 'text-slate-400'}`}>
      {label}
    </span>
  </button>
);

const BottomNav: React.FC<BottomNavProps> = ({ activeView, setActiveView, showLibrary }) => {
  const navItems = [
    { id: 'trending', label: 'Tendencias', icon: <TrendingIcon /> },
    { id: 'search', label: 'Buscar', icon: <SearchIcon /> },
    ...(showLibrary ? [
      { id: 'library', label: 'Mi lista', icon: <LibraryIcon /> },
      { id: 'history', label: 'Historial', icon: <HistoryIcon /> },
    ] : []),
    { id: 'settings', label: 'Ajustes', icon: <SettingsIcon /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-800/80 backdrop-blur-lg border-t border-slate-700 shadow-lg z-50">
      <div className="flex justify-around items-center h-full max-w-md mx-auto">
        {navItems.map(item => (
          <NavItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            isActive={activeView === item.id}
            onClick={() => setActiveView(item.id as View)}
          />
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;