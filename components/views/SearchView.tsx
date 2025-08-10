import React, { useState, useEffect, useCallback } from 'react';
import { Media, MediaFormat, MediaStatus, MediaSort, Genre } from '../../types';
import { searchMedia, getGenreCollection } from '../../services/anilistService';
import MediaCard from '../MediaCard';
import Spinner from '../Spinner';
import { SearchIcon, FilterIcon, CloseIcon } from '../icons';
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
            <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
            <select value={value} onChange={onChange} className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
        </div>
    );
    
    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex justify-end" onClick={onClose}>
            <div className="w-full max-w-sm h-full bg-slate-800 shadow-2xl p-4 overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">Filtros Avanzados</h2>
                    <button onClick={onClose}><CloseIcon className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                    {renderSelect("Tipo", filters.type, e => setFilters(f => ({...f, type: e.target.value as any})), [
                        { value: "", label: "Cualquiera" }, { value: "ANIME", label: "Anime" }, { value: "MANGA", label: "Manga" }
                    ])}
                    {renderSelect("Ordenar por", filters.sort, e => setFilters(f => ({...f, sort: e.target.value as MediaSort})), Object.entries(MediaSort).map(([key, val]) => ({ value: val, label: key.replace(/_/g, ' ')})))}
                    <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-2">Géneros</h3>
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto bg-slate-900/50 p-2 rounded-lg">
                            {allGenres.map(genre => (
                                <button key={genre.name} onClick={() => handleGenreToggle(genre.name)} className={`px-3 py-1 text-sm rounded-full transition-colors ${filters.genres.includes(genre.name) ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                                    {genre.name}
                                </button>
                            ))}
                        </div>
                    </div>
                     <button onClick={onApply} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-500 transition-colors">
                        Aplicar Filtros
                    </button>
                </div>
            </div>
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
    const { token } = useAuth();
    
    useEffect(() => {
        getGenreCollection().then(setAllGenres).catch(e => console.error("Failed to fetch genres", e));
    }, []);

    const performSearch = useCallback(async () => {
        setIsLoading(true);
        setIsFilterOpen(false);
        try {
            const apiFilters = {
                ...filters,
                type: filters.type ? filters.type : undefined,
            };
            const data = await searchMedia(apiFilters, token);
            setResults(data);
        } catch (error) {
            console.error("Failed to search media:", error);
        } finally {
            setIsLoading(false);
        }
    }, [filters, token]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        performSearch();
    };

    return (
        <div className="pt-6">
            <header className="px-4 mb-6">
                <h1 className="text-3xl font-extrabold tracking-tight text-white">Buscar</h1>
                <form onSubmit={handleSearchSubmit} className="mt-4 flex gap-2 items-center">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar anime, manga..."
                            value={filters.query}
                            onChange={(e) => setFilters(f => ({ ...f, query: e.target.value }))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-full py-3 pl-12 pr-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 pointer-events-none">
                            <SearchIcon />
                        </div>
                    </div>
                     <button
                        type="submit"
                        aria-label="Buscar"
                        className="flex-shrink-0 p-3 bg-indigo-600 text-white rounded-full transition-colors hover:bg-indigo-500 active:bg-indigo-700 shadow-lg"
                    >
                        <SearchIcon className="w-6 h-6" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsFilterOpen(true)}
                        className="flex-shrink-0 p-3 bg-slate-800 border border-slate-700 rounded-full text-slate-300"
                        aria-label="Abrir filtros"
                    >
                        <FilterIcon className="w-6 h-6" />
                    </button>
                </form>
            </header>
            
            <FilterPanel isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} filters={filters} setFilters={setFilters} allGenres={allGenres} onApply={performSearch}/>

            <div className="px-4 pb-4">
                {isLoading && <Spinner />}
                {!isLoading && results.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-slate-400">Comienza una búsqueda o aplica filtros.</p>
                    </div>
                )}
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {results.map(media => (
                        <MediaCard key={media.id} media={media} onClick={() => onMediaSelect(media)} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SearchView;