/**
 * Interfaces for the data structures we expect from the API.
 */
export interface VideoSource {
    url: string;
    name: string;
}

export interface MangaPage {
    img: string;
    page: number;
    [key: string]: any; // Allows other properties like 'headers'
}

export interface DebugLogEntry {
    step: string;
    url?: string;
    response?: any;
    extracted?: any;
    error?: string;
}

export interface ProviderResult<T> {
    data: T | null;
    log: DebugLogEntry[];
}


// The base URL of your API instance.
const CONSUMET_API_URL = 'https://multi-api-animaid.vercel.app';

// Lists of providers to use.
export const ANIME_PROVIDERS = ['tioanime', 'flv'];
export const MANGA_PROVIDERS = ['comick', 'nhentai', 'inmanga'];

// --- UTILITY FUNCTIONS ---

/**
 * Performs a fetch request with a timeout and standardized error handling.
 * @param url The URL to request.
 * @param options The request options (method, body, etc.).
 * @param timeout The timeout in milliseconds.
 * @returns A promise that resolves with the JSON data.
 */
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
    }
    finally {
        clearTimeout(id);
    }
};

// --- ANILIST AUTHENTICATION ---
/**
 * Exchanges an AniList authorization code for an access token via a proxy.
 * This is necessary to keep the client_secret secure.
 * @param code The authorization code from AniList.
 * @param clientId The AniList client ID.
 * @returns A promise that resolves to the access token.
 */
export const exchangeCodeForToken = async (code: string, clientId: string): Promise<string> => {
    const url = `${CONSUMET_API_URL}/meta/anilist/token`; 
    const body = {
        grant_type: 'authorization_code',
        client_id: clientId,
        code: code,
        redirect_uri: window.location.origin
    };

    const data = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!data.access_token) {
        throw new Error('Proxy did not return an access_token. Response: ' + JSON.stringify(data));
    }
    
    return data.access_token;
};


// --- ANIME LOGIC (Provider by Provider) ---
export const getAnimeEpisodeSourcesFromProvider = async (provider: string, title: string, episodeNumber: number): Promise<ProviderResult<VideoSource[]>> => {
    const log: DebugLogEntry[] = [];
    
    try {
        // Step 1: Search for anime to get its info URL
        const searchUrl = `${CONSUMET_API_URL}/anime/${provider}/filter?title=${encodeURIComponent(title)}`;
        log.push({ step: `Paso 1: Buscar anime con filtro`, url: searchUrl });
        const searchData = await fetchWithTimeout(searchUrl);
        log[log.length-1].response = searchData;
        
        if (!searchData.results || searchData.results.length === 0) {
            throw new Error(`No se encontraron resultados para "${title}"`);
        }
        
        const animeInfoPath = searchData.results[0].url;
        if (!animeInfoPath) {
            throw new Error(`El resultado de la búsqueda no contiene una URL para "${title}"`);
        }
        log[log.length-1].extracted = `Ruta de info encontrada: ${animeInfoPath}`;

        // Step 2: Get anime info to find the specific episode.
        const infoUrl = `${CONSUMET_API_URL}${animeInfoPath}`;
        log.push({ step: 'Paso 2: Obtener información del anime', url: infoUrl });
        const animeInfo = await fetchWithTimeout(infoUrl);
        log[log.length-1].response = animeInfo;
        
        if (!animeInfo.episodes || animeInfo.episodes.length === 0) {
            throw new Error('No se encontraron episodios para este anime.');
        }
        
        // Find the episode by comparing numbers safely.
        const episode = animeInfo.episodes.find((ep: any) => {
            // Extract number from strings like "Episode 37" or just "37"
            const match = String(ep.number).match(/\d+/);
            const parsedEpNumber = match ? parseInt(match[0], 10) : NaN;
            return parsedEpNumber === Number(episodeNumber);
        });
        if (!episode) {
            throw new Error(`Episodio ${episodeNumber} no encontrado.`);
        }

        let sourcesUrl: string;
        
        // For some providers (like tioanime), the episode object contains the direct watch URL path.
        if (episode.url && episode.url.startsWith('/')) {
            sourcesUrl = `${CONSUMET_API_URL}${episode.url}`;
            log[log.length-1].extracted = `Ruta directa de episodio encontrada: ${episode.url}`;
        } 
        // For others, it might contain an ID that needs to be used with a /watch/{id} endpoint.
        else if (episode.id) {
            sourcesUrl = `${CONSUMET_API_URL}/anime/${provider}/watch/${episode.id}`;
            log[log.length-1].extracted = `ID de episodio encontrado: ${episode.id}`;
        } 
        // Final fallback if the structure is unexpected (e.g. ID is in the URL).
        else {
             const episodeId = episode.url?.split('/').pop();
             if (!episodeId) {
                throw new Error(`Episodio ${episodeNumber} no tiene una URL o ID válida.`);
             }
             sourcesUrl = `${CONSUMET_API_URL}/anime/${provider}/watch/${episodeId}`;
             log[log.length-1].extracted = `ID de episodio extraído de la URL: ${episodeId}`;
        }
        
        // Step 3: Get video sources from the determined URL
        log.push({ step: `Paso 3: Obtener fuentes de video`, url: sourcesUrl });
        const sourcesData = await fetchWithTimeout(sourcesUrl);
        log[log.length-1].response = sourcesData;

        if (Array.isArray(sourcesData) && sourcesData.length > 0) {
            const validSources: VideoSource[] = sourcesData
                .filter((s: any) => s.url && typeof s.url === 'string')
                .map((s: any) => ({
                    name: s.name || 'Desconocido',
                    url: s.url,
                }));

            if (validSources.length > 0) {
                log[log.length - 1].extracted = `Encontradas ${validSources.length} fuentes de video.`;
                log.push({ step: '¡Éxito! Fuentes encontradas.' });
                return { data: validSources, log };
            }
        }
        
        throw new Error('No se encontraron fuentes de video válidas en la respuesta.');

    } catch (error: any) {
        const lastLog = log.length > 0 ? log[log.length - 1] : null;
        if (lastLog && !lastLog.error) {
            lastLog.error = error.message;
        } else if (!lastLog) {
            log.push({ step: 'Error inicial', error: error.message });
        }
        return { data: null, log };
    }
};


// --- MANGA LOGIC (Provider by Provider) ---
export const getMangaChapterPagesFromProvider = async (provider: string, mangaTitle: string, chapterNumber: number): Promise<ProviderResult<MangaPage[]>> => {
    const log: DebugLogEntry[] = [];

    try {
        const searchUrl = `${CONSUMET_API_URL}/manga/${provider}/filter?title=${encodeURIComponent(mangaTitle)}`;
        log.push({ step: `Paso 1: Buscar manga con filtro`, url: searchUrl });
        const searchData = await fetchWithTimeout(searchUrl);
        log[log.length - 1].response = searchData;

        if (!searchData.results || searchData.results.length === 0) {
            throw new Error(`No se encontraron resultados para "${mangaTitle}" en ${provider}`);
        }

        const mangaInfoPath = searchData.results[0].url;
        if (!mangaInfoPath) {
            throw new Error(`El resultado de la búsqueda de manga no contiene una URL para "${mangaTitle}"`);
        }
        log[log.length-1].extracted = `Ruta de info encontrada: ${mangaInfoPath}`;
    
        const infoUrl = `${CONSUMET_API_URL}${mangaInfoPath}`;
        log.push({ step: `Paso 2: Obtener información del manga`, url: infoUrl });
        const mangaInfo = await fetchWithTimeout(infoUrl);
        log[log.length - 1].response = mangaInfo;
        
        if (!mangaInfo.chapters || mangaInfo.chapters.length === 0) {
            throw new Error('No se encontraron capítulos para este manga.');
        }
        const chapter = mangaInfo.chapters.find((ch: any) => {
            // Extract number from strings like "Chapter 10"
            const match = String(ch.number).match(/\d+/);
            const parsedChNumber = match ? parseInt(match[0], 10) : NaN;
            return parsedChNumber === Number(chapterNumber);
        });
        if (!chapter || !chapter.id) {
            throw new Error(`Capítulo ${chapterNumber} no encontrado.`);
        }
        log[log.length-1].extracted = `ID de capítulo encontrado: ${chapter.id}`;

        const chapterUrl = `${CONSUMET_API_URL}/manga/${provider}/read/${chapter.id}`;
        log.push({ step: `Paso 3: Obtener páginas del capítulo`, url: chapterUrl });
        const chapterData = await fetchWithTimeout(chapterUrl);
        log[log.length - 1].response = chapterData;
    
        if (!chapterData || chapterData.length === 0) {
            throw new Error('No se encontraron páginas para este capítulo.');
        }
        log.push({ step: '¡Éxito! Páginas encontradas.' });
        return { data: chapterData, log };

    } catch (error: any) {
        const lastLog = log.length > 0 ? log[log.length - 1] : null;
        if (lastLog && !lastLog.error) {
            lastLog.error = error.message;
        } else {
            log.push({ step: 'Error inicial', error: error.message });
        }
        return { data: null, log };
    }
};