import { Media } from '../types';

const MAPPINGS_KEY = 'animaid_anilist_mappings';

// Structure: { [originalMediaId: number]: Media }
type AnilistMappings = Record<number, Media>;

const loadMappings = (): AnilistMappings => {
    try {
        const stored = localStorage.getItem(MAPPINGS_KEY);
        if (stored) {
            return JSON.parse(stored) as AnilistMappings;
        }
    } catch (error) {
        console.error("Error loading Anilist mappings from Local Storage:", error);
        localStorage.removeItem(MAPPINGS_KEY);
    }
    return {};
};

const saveMappings = (mappings: AnilistMappings): void => {
    try {
        localStorage.setItem(MAPPINGS_KEY, JSON.stringify(mappings));
    } catch (error) {
        console.error("Error saving Anilist mappings to Local Storage:", error);
    }
};

/**
 * Retrieves the user-corrected media object for an original media ID.
 * @param originalId The ID of the media initially clicked by the user.
 * @returns The corrected Media object, or undefined if no correction exists.
 */
export const getAnilistMapping = (originalId: number): Media | undefined => {
    const mappings = loadMappings();
    return mappings[originalId];
};

/**
 * Saves the user's media correction choice.
 * @param originalId The ID of the media that was incorrect.
 * @param correctedMedia The Media object the user selected as the correct one.
 */
export const saveAnilistMapping = (originalId: number, correctedMedia: Media): void => {
    const mappings = loadMappings();
    mappings[originalId] = correctedMedia;
    saveMappings(mappings);
};
