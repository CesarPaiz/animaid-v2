import { SearchResult } from './contentService';

const MAPPINGS_KEY = 'animaid_provider_mappings';

// La estructura de los mapeos almacenados será:
// {
//   [mediaId: number]: {
//     [providerName: string]: SearchResult
//   }
// }
type ProviderMappings = Record<number, Record<string, SearchResult>>;

/**
 * Carga todos los mapeos guardados desde el Local Storage.
 * Maneja de forma segura el caso en que no hay datos o los datos están corruptos.
 * @returns Un objeto con todos los mapeos guardados.
 */
const loadMappings = (): ProviderMappings => {
    try {
        const stored = localStorage.getItem(MAPPINGS_KEY);
        if (stored) {
            return JSON.parse(stored) as ProviderMappings;
        }
    } catch (error) {
        console.error("Error al cargar los mapeos de proveedores desde Local Storage:", error);
        // Si hay un error, elimina la entrada corrupta para evitar problemas futuros.
        localStorage.removeItem(MAPPINGS_KEY);
    }
    return {};
};

/**
 * Guarda un objeto de mapeos completo en el Local Storage.
 * @param mappings El objeto de mapeos a guardar.
 */
const saveMappings = (mappings: ProviderMappings): void => {
    try {
        localStorage.setItem(MAPPINGS_KEY, JSON.stringify(mappings));
    } catch (error) {
        console.error("Error al guardar los mapeos de proveedores en Local Storage:", error);
    }
};

/**
 * Obtiene el resultado de búsqueda guardado para un media específico y un proveedor.
 * @param mediaId El ID del anime/manga de AniList.
 * @param providerName El nombre del proveedor (ej. 'tioanime').
 * @returns El objeto SearchResult guardado, o undefined si no se encuentra.
 */
export const getProviderMapping = (mediaId: number, providerName: string): SearchResult | undefined => {
    const mappings = loadMappings();
    return mappings[mediaId]?.[providerName];
};

/**
 * Guarda la selección de un resultado de búsqueda para un media específico y un proveedor.
 * Esta selección se mantendrá para futuras visitas.
 * @param mediaId El ID del anime/manga de AniList.
 * @param providerName El nombre del proveedor.
 * @param selection El objeto SearchResult que el usuario ha seleccionado.
 */
export const saveProviderMapping = (mediaId: number, providerName: string, selection: SearchResult): void => {
    const mappings = loadMappings();
    
    // Si no existe una entrada para este mediaId, la crea.
    if (!mappings[mediaId]) {
        mappings[mediaId] = {};
    }

    // Asigna la selección al proveedor correspondiente.
    mappings[mediaId][providerName] = selection;
    
    // Guarda el objeto de mapeos actualizado.
    saveMappings(mappings);
};