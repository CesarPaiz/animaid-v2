// src/components/Icons.tsx

// Importa los íconos de contorno (outline)
import {
  ArrowTrendingUpIcon,
  MagnifyingGlassIcon,
  BuildingLibraryIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  BookOpenIcon,
  FunnelIcon,
  XMarkIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  UserCircleIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

// Importa los íconos rellenos (solid)
import { StarIcon as StarIconSolid, PlayIcon as PlayIconSolid, CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import React from 'react';

// --- Íconos Personalizados (que no están en Heroicons) ---

interface IconProps {
  className?: string;
}

// Este es un ícono de marca, no está en Heroicons. Lo mantienes como estaba.
export const AnilistIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.25 5.125a.75.75 0 0 0-1.5 0v1.569l-4-3.5a.75.75 0 0 0-.968.03L9 8.25v-3a.75.75 0 0 0-1.5 0v10.5a.75.75 0 0 0 1.5 0v-5.69l4.968 4.438a.75.75 0 0 0 .968-.03L18.75 10.5v5.25a.75.75 0 0 0 1.5 0v-10.5Z" />
    </svg>
);


// --- Re-exportación de íconos de Heroicons con tus nombres ---
// Así, el resto de tu app no necesita saber los nombres oficiales de Heroicons.

export const TrendingIcon = ArrowTrendingUpIcon;
export const SearchIcon = MagnifyingGlassIcon;
export const LibraryIcon = BuildingLibraryIcon;
export const SettingsIcon = Cog6ToothIcon;
export const FilterIcon = FunnelIcon;
export const CloseIcon = XMarkIcon;
export const HistoryIcon = ClockIcon;
export const CopyIcon = DocumentDuplicateIcon;

// Chevrons y flechas ya tienen el nombre correcto
export { ChevronLeftIcon, ChevronRightIcon, ArrowLeftIcon, BookOpenIcon, UserCircleIcon, ChevronUpIcon, ClockIcon, Cog6ToothIcon };

// Íconos sólidos
export const StarIcon = StarIconSolid;
export const PlayIcon = PlayIconSolid;
export { CheckIconSolid };