import React from 'react';
import { HomeIcon, SearchIcon, LibraryIcon, SettingsIcon, HistoryIcon } from './icons';
import { MainView } from '../types';

interface SideNavProps {
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
    className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors duration-200 ease-in-out focus:outline-none group relative"
    style={{ justifyContent: 'initial' }}
  >
    <div className={`w-6 h-6 flex-shrink-0 transition-colors duration-200 ease-in-out ${isActive ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-200'}`}>
        {icon}
    </div>
    <span className={`text-base font-semibold transition-colors duration-200 ease-in-out lg:block hidden ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
      {label}
    </span>
    {isActive && <div className="absolute left-0 h-6 w-1 bg-indigo-500 rounded-r-full lg:hidden"></div>}
  </a>
);


const SideNav: React.FC<SideNavProps> = ({ activeView, showLibrary }) => {
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
    <nav className="hidden md:block md:w-20 lg:w-64 md:flex-shrink-0 fixed top-0 left-0 h-full bg-gray-950 border-r border-gray-800/80 z-50">
      <div className="flex flex-col h-full p-2">
        <div className="text-center py-4 mb-4 lg:text-left lg:px-4">
            <h1 className="text-2xl font-black tracking-tighter text-white">
                <span className="bg-gradient-to-r from-indigo-400 to-purple-400 text-transparent bg-clip-text">
                    <span className="lg:hidden">A</span>
                    <span className="hidden lg:inline">Animaid</span>
                </span>
            </h1>
        </div>
        <div className="flex flex-col gap-2">
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
      </div>
    </nav>
  );
};

export default SideNav;
