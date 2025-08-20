import React from 'react';
import { HomeIcon, SearchIcon, LibraryIcon, SettingsIcon, HistoryIcon } from './icons';
import { MainView } from '../types';

interface BottomNavProps {
  activeView: MainView;
  showLibrary: boolean;
}

interface NavItemProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  href: string;
}

const NavItem: React.FC<NavItemProps> = ({ label, icon, isActive, href }) => (
  <a
    href={href}
    className="flex-1 flex flex-col items-center justify-center h-full transition-colors duration-300 ease-in-out focus:outline-none group"
  >
    <div className={`relative flex items-center justify-center h-12 w-16 transition-all duration-300 ease-in-out`}>
        <div className={`absolute inset-0 transition-all duration-300 ease-in-out ${isActive ? 'bg-indigo-500/20 scale-100' : 'scale-0'} rounded-full`}></div>
        <div className={`w-6 h-6 transition-colors duration-200 ease-in-out ${isActive ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-200'}`}>
            {icon}
        </div>
    </div>
    <span className={`text-xs font-semibold -mt-2 transition-colors duration-200 ease-in-out ${isActive ? 'text-indigo-400' : 'text-gray-500'}`}>
      {label}
    </span>
  </a>
);

const BottomNav: React.FC<BottomNavProps> = ({ activeView, showLibrary }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: <HomeIcon /> },
    { id: 'search', label: 'Buscar', icon: <SearchIcon /> },
    ...(showLibrary ? [
      { id: 'library', label: 'Mi Lista', icon: <LibraryIcon /> },
      { id: 'history', label: 'Historial', icon: <HistoryIcon /> },
    ] : []),
    { id: 'settings', label: 'Ajustes', icon: <SettingsIcon /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-gray-950/80 backdrop-blur-xl border-t border-gray-800/80 z-50 md:hidden">
      <div className="flex justify-around items-center h-full max-w-md mx-auto px-2">
        {navItems.map(item => (
          <NavItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            isActive={activeView === item.id}
            href={`#/${item.id}`}
          />
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
