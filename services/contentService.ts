import { Media } from '../types';
import { sanitizeTitleForProvider } from './titleSanitizer';

export interface VideoSource {
    url: string;
    name: string;
}

export interface MangaPage {
    img: string;
    page: number;
    [key: string]: any;
}

export interface DebugLogEntry {
    step: string;
    url?: string;
    response?: any;
    extracted?: any;
    error?: string;
}

export interface SearchResult {
    title: string;
    url: string;
    img?: string;
    [key: string]: any;
}

export interface ProviderResult<T> {
    data: T | null;
    log: DebugLogEntry[];
    searchResults?: SearchResult[];
    selectedResult?: SearchResult;
}

const CONSUMET_API_URL = 'https://multi-api-animaid.vercel.app';
export const ANIME_PROVIDERS = ['tioanime', 'flv'];
export const MANGA_PROVIDERS = ['comick', 'nhentai', 'inmanga'];

const safeJoinUrl = (base: string, path: string): string => {
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const baseUrl = base.endsWith('/') ? base.slice(0, -1) : base;
    const pathUrl = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${pathUrl}`;
};

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 20000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        const responseBody = await response.text();

        if (!response.ok) {
            throw new Error(`Error en la petición a ${url}: ${response.status}. Respuesta: ${responseBody}`);
        }
        
        try {
            return JSON.parse(responseBody);
        } catch (e) {
             throw new Error(`Fallo al analizar JSON de ${url}. Respuesta: ${responseBody}`);
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            throw new Error(`La petición a ${url} excedió el tiempo de espera de ${timeout / 1000}s.`);
        }
        throw error;
    } finally {
        clearTimeout(id);
    }
};

const handleProviderError = (error: any, log: DebugLogEntry[]): { data: null; log: DebugLogEntry[] } => {
    const lastLog = log.length > 0 ? log[log.length - 1] : null;
    if (lastLog && !lastLog.error) {
        lastLog.error = error.message;
    } else if (!lastLog) {
        log.push({ step: 'Error inicial', error: error.message });
    }
    return { data: null, log };
};

export const getAnimeEpisodeSourcesFromProvider = async (
    provider: string, 
    media: Media, 
    episodeNumber: number,
    preSelectedResult?: SearchResult
): Promise<ProviderResult<VideoSource[]>> => {
    const log: DebugLogEntry[] = [];
    let searchResults: SearchResult[] | undefined;
    let selectedResult: SearchResult | undefined;
    
    try {
        if (preSelectedResult) {
            selectedResult = preSelectedResult;
            log.push({ step: `Paso 1: Usando resultado pre-seleccionado`, extracted: selectedResult.url });
        } else {
            const sanitizedTitle = sanitizeTitleForProvider(media.title.english || media.title.romaji);
            const searchUrl = `${CONSUMET_API_URL}/anime/${provider}/filter?title=${encodeURIComponent(sanitizedTitle)}`;
            log.push({ step: `Paso 1: Buscar anime con filtro`, url: searchUrl, extracted: `Título sanitizado: "${sanitizedTitle}"` });
            const searchData = await fetchWithTimeout(searchUrl);
            log[log.length-1].response = searchData;
            
            if (!searchData.results || searchData.results.length === 0) throw new Error(`No se encontraron resultados para "${sanitizedTitle}"`);
            
            searchResults = searchData.results;
            selectedResult = searchResults![0];
            log[log.length-1].extracted = `Ruta de info encontrada: ${selectedResult!.url}`;
        }
        
        const animeInfoPath = selectedResult!.url;
        const infoUrl = safeJoinUrl(CONSUMET_API_URL, animeInfoPath);
        log.push({ step: 'Paso 2: Obtener información del anime', url: infoUrl });
        const animeInfo = await fetchWithTimeout(infoUrl);
        log[log.length-1].response = animeInfo;
        
        if (!animeInfo.episodes || animeInfo.episodes.length === 0) throw new Error('No se encontraron episodios para este anime.');
        
        const episode = animeInfo.episodes.find((ep: any) => Number(String(ep.number).match(/\d+/)?.[0]) === Number(episodeNumber));
        if (!episode) throw new Error(`Episodio ${episodeNumber} no encontrado.`);

        let sourcesUrl: string;
        if (episode.url) sourcesUrl = safeJoinUrl(CONSUMET_API_URL, episode.url);
        else if (episode.id) sourcesUrl = `${CONSUMET_API_URL}/anime/${provider}/watch/${episode.id}`;
        else throw new Error(`Episodio ${episodeNumber} no tiene una URL o ID válida.`);
        log[log.length-1].extracted = `URL/ID de episodio: ${episode.url || episode.id}`;
        
        log.push({ step: `Paso 3: Obtener fuentes de video`, url: sourcesUrl });
        const sourcesData = await fetchWithTimeout(sourcesUrl);
        log[log.length-1].response = sourcesData;

        if (Array.isArray(sourcesData) && sourcesData.length > 0) {
            const validSources: VideoSource[] = sourcesData
                .filter(s => s.url)
                .map(s => ({ name: s.name || 'Desconocido', url: s.url }));
            if (validSources.length > 0) {
                log[log.length - 1].extracted = `Encontradas ${validSources.length} fuentes.`;
                log.push({ step: '¡Éxito! Fuentes encontradas.' });
                return { data: validSources, log, searchResults, selectedResult };
            }
        }
        
        throw new Error('No se encontraron fuentes de video válidas.');

    } catch (error: any) {
        return { ...handleProviderError(error, log), searchResults, selectedResult };
    }
};

export const getMangaChapterPagesFromProvider = async (
    provider: string,
    media: Media,
    chapterNumber: number,
    preSelectedResult?: SearchResult
): Promise<ProviderResult<MangaPage[]>> => {
    const log: DebugLogEntry[] = [];
    let searchResults: SearchResult[] | undefined;
    let selectedResult: SearchResult | undefined;

    try {
        if (preSelectedResult) {
            selectedResult = preSelectedResult;
            log.push({ step: `Paso 1: Usando resultado pre-seleccionado`, extracted: selectedResult.url });
        } else {
            const sanitizedTitle = sanitizeTitleForProvider(media.title.english || media.title.romaji);
            const searchUrl = `${CONSUMET_API_URL}/manga/${provider}/filter?title=${encodeURIComponent(sanitizedTitle)}`;
            log.push({ step: `Paso 1: Buscar manga con filtro`, url: searchUrl, extracted: `Título sanitizado: "${sanitizedTitle}"` });
            const searchData = await fetchWithTimeout(searchUrl);
            log[log.length - 1].response = searchData;

            if (!searchData.results || searchData.results.length === 0) throw new Error(`No se encontraron resultados para "${sanitizedTitle}"`);
            
            searchResults = searchData.results;
            selectedResult = searchResults![0];
            log[log.length-1].extracted = `Ruta de info encontrada: ${selectedResult!.url}`;
        }
        
        const infoUrl = safeJoinUrl(CONSUMET_API_URL, selectedResult!.url);
        log.push({ step: `Paso 2: Obtener información del manga`, url: infoUrl });
        const mangaInfo = await fetchWithTimeout(infoUrl);
        log[log.length - 1].response = mangaInfo;
        
        if (!mangaInfo.chapters || mangaInfo.chapters.length === 0) throw new Error('No se encontraron capítulos.');
        
        const chapter = mangaInfo.chapters.find((ch: any) => Number(String(ch.number).match(/\d+/)?.[0]) === Number(chapterNumber));
        if (!chapter || !chapter.id) throw new Error(`Capítulo ${chapterNumber} no encontrado.`);
        log[log.length-1].extracted = `ID de capítulo: ${chapter.id}`;

        const chapterUrl = `${CONSUMET_API_URL}/manga/${provider}/read/${chapter.id}`;
        log.push({ step: `Paso 3: Obtener páginas del capítulo`, url: chapterUrl });
        const chapterData = await fetchWithTimeout(chapterUrl);
        log[log.length - 1].response = chapterData;
    
        if (!chapterData || chapterData.length === 0) throw new Error('No se encontraron páginas.');
        
        log.push({ step: '¡Éxito! Páginas encontradas.' });
        return { data: chapterData, log, searchResults, selectedResult };

    } catch (error: any) {
        return { ...handleProviderError(error, log), searchResults, selectedResult };
    }
};