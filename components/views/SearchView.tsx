import React, { useState, useEffect, useCallback } from 'react';
import { Media, MediaFormat, MediaStatus, MediaSort, Genre } from '../../types';
import { searchMedia, getGenreCollection } from '../../services/anilistService';
import MediaCard from '../MediaCard';
import Spinner from '../Spinner';
import { SearchIcon, FilterIcon, CloseIcon, ChevronLeftIcon, ChevronRightIcon } from '../icons';
import { useAuth } from '../../context/AuthContext';

interface FilterState {
    query: string;
    type: 'ANIME' | 'MANGA' | '';
    formats: MediaFormat[];
    stati: MediaStatus[];
    genres: string[];
    sort: MediaSort;
}

const FilterPanel: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    filters: FilterState;
    setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
    allGenres: Genre[];
    onApply: () => void;
}> = ({ isOpen, onClose, filters, setFilters, allGenres, onApply }) => {
    if (!isOpen) return null;

    const handleGenreToggle = (genre: string) => {
        setFilters(prev => ({
            ...prev,
            genres: prev.genres.includes(genre) ? prev.genres.filter(g => g !== genre) : [...prev.genres, genre]
        }));
    };
    
    const renderSelect = (label: string, value: any, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: {value: string, label: string}[]) => (
        <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
            <select value={value} onChange={onChange} className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        </div>
    );
    
    return (
        <div className="fixed inset-0 bg-black/70 z-[70] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={onClose}>
            <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Filtros Avanzados</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700"><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="space-y-6">
                    {renderSelect("Tipo", filters.type, e => setFilters(f => ({...f, type: e.target.value as any})), [
                        { value: "", label: "Cualquiera" }, { value: "ANIME", label: "Anime" }, { value: "MANGA", label: "Manga" }
                    ])}
                    {renderSelect("Ordenar por", filters.sort, e => setFilters(f => ({...f, sort: e.target.value as MediaSort})), Object.entries(MediaSort).map(([key, val]) => ({ value: val, label: key.replace(/_/g, ' ')})))}
                    <div>
                        <h3 className="text-sm font-medium text-gray-300 mb-2">Géneros</h3>
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto bg-gray-800/50 p-3 rounded-lg overscroll-y-contain">
                            {allGenres.map(genre => (
                                <button key={genre.name} onClick={() => handleGenreToggle(genre.name)} className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${filters.genres.includes(genre.name) ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                                    {genre.name}
                                </button>
                            ))}
                        </div>
                    </div>
                     <button onClick={onApply} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900">
                        Aplicar Filtros
                    </button>
                </div>
            </div>
        </div>
    );
};

const generatePagination = (currentPage: number, totalPages: number): (number | '...')[] => {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
        return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
        return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
};

const Pagination: React.FC<{
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
    const paginationItems = generatePagination(currentPage, totalPages);

    return (
        <div className="flex items-center justify-center gap-1 sm:gap-2">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Página anterior"
            >
                <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1 sm:gap-2">
                {paginationItems.map((item, index) => {
                    if (item === '...') {
                        return (
                            <span key={`dots-${index}`} className="flex items-center justify-center w-9 h-9 text-sm font-bold text-gray-500">
                                ...
                            </span>
                        );
                    }
                    const isActive = item === currentPage;
                    return (
                        <button
                            key={item}
                            onClick={() => onPageChange(item)}
                            className={`w-9 h-9 text-sm font-bold rounded-lg transition-all duration-200 flex items-center justify-center ${
                                isActive
                                    ? 'bg-indigo-600 text-white shadow-md scale-110'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:scale-105'
                            }`}
                        >
                            {item}
                        </button>
                    );
                })}
            </div>
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Siguiente página"
            >
                <ChevronRightIcon className="w-5 h-5" />
            </button>
        </div>
    );
};


const SearchView: React.FC<{ onMediaSelect: (media: Media) => void }> = ({ onMediaSelect }) => {
    const [filters, setFilters] = useState<FilterState>({
        query: '',
        type: '',
        formats: [],
        stati: [],
        genres: [],
        sort: MediaSort.POPULARITY_DESC,
    });
    const [results, setResults] = useState<Media[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [allGenres, setAllGenres] = useState<Genre[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState<number | null>(null);
    const { showNsfw } = useAuth();
    
    useEffect(() => {
        getGenreCollection().then(setAllGenres).catch(e => console.error("Failed to fetch genres", e));
    }, []);

    const performSearch = useCallback(async (page: number, isNewSearch = false) => {
        if (!filters.query && !filters.genres?.length) {
            setResults([]);
            return;
        }
        
        if (isNewSearch) {
            setLastPage(null);
        }

        setIsLoading(true);
        const searchPage = isNewSearch ? 1 : page;

        setIsFilterOpen(false);
        try {
            const apiFilters = {
                ...filters,
                type: filters.type ? filters.type : undefined,
                showNsfw,
            };
            const data = await searchMedia(apiFilters, searchPage);
            setResults(data.media);
            setLastPage(data.lastPage || null);
            setCurrentPage(searchPage);
        } catch (error) {
            console.error("Failed to search media:", error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [filters, showNsfw]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        performSearch(1, true);
    };

    return (
        <div className="pt-8 md:pt-0">
            <header className="px-4 md:px-6 lg:px-8 mb-6 md:pt-8">
                <h1 className="text-4xl font-black tracking-tighter text-white"><span className="animated-gradient">Animaid</span></h1>
                <p className="text-gray-400 mt-1">Busca tu próximo anime o manga favorito.</p>
                <form onSubmit={handleSearchSubmit} className="flex gap-2 items-center mt-4">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar anime, manga..."
                            value={filters.query}
                            onChange={(e) => setFilters(f => ({ ...f, query: e.target.value }))}
                            className="w-full bg-gray-900 border-2 border-gray-700/80 rounded-full py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500 pointer-events-none">
                            <SearchIcon />
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsFilterOpen(true)}
                        className="flex-shrink-0 p-3 bg-gray-800 border-2 border-gray-700/80 rounded-full text-gray-300 hover:bg-gray-700 transition-colors"
                        aria-label="Abrir filtros"
                    >
                        <FilterIcon className="w-6 h-6" />
                    </button>
                </form>
            </header>
            
            <FilterPanel isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} filters={filters} setFilters={setFilters} allGenres={allGenres} onApply={() => performSearch(1, true)}/>

            <div className="px-4 md:px-6 lg:px-8 pb-8">
                {isLoading && results.length === 0 ? <Spinner /> : null}
                {!isLoading && results.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-gray-500">Comienza una búsqueda o aplica filtros para ver resultados.</p>
                    </div>
                )}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                    {results.map(media => (
                        <MediaCard key={media.id} media={media} onClick={() => onMediaSelect(media)} />
                    ))}
                </div>

                {results.length > 0 && lastPage && lastPage > 1 && (
                     <div className="mt-8">
                        <Pagination 
                            currentPage={currentPage}
                            totalPages={lastPage}
                            onPageChange={(page) => performSearch(page)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchView;