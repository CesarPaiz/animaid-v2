import { Media, MediaFormat, MediaStatus, MediaSort, Genre } from '../types';

// The official AniList GraphQL endpoint.
const API_URL = 'https://graphql.anilist.co';

// --- Caching Layer ---
// In-memory cache to store API responses and reduce redundant requests to AniList.
const apiCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_DURATION_MS = 25 * 60 * 1000; // Cache responses for 25 minutes.


// A reusable GraphQL fragment to get all the media fields we need.
// This ensures consistency and avoids repetition.
const mediaFragment = `
  fragment media on Media {
    id
    title {
      romaji
      english
      native
    }
    coverImage {
      extraLarge
      large
      color
    }
    bannerImage
    format
    status
    episodes
    chapters
    averageScore
    description(asHtml: false)
    genres
    isAdult
    nextAiringEpisode {
      airingAt
      timeUntilAiring
      episode
    }
  }
`;

// API Helper for GraphQL requests with caching.
async function fetchFromGraphQL(query: string, variables: Record<string, any> = {}) {
  const cacheKey = JSON.stringify({ query, variables });
  const cachedItem = apiCache.get(cacheKey);

  // If a valid, non-expired item is in the cache, return it.
  if (cachedItem && (Date.now() - cachedItem.timestamp < CACHE_DURATION_MS)) {
    return cachedItem.data;
  }
  
  // Otherwise, fetch from the network.
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GraphQL API Error: ${response.status} - ${errorBody}`);
  }

  const json = await response.json();
  if (json.errors) {
    // It's useful to log the query that failed for debugging.
    console.error("GraphQL Query Failed:", { query, variables, errors: json.errors });
    throw new Error(`GraphQL Query Error: ${JSON.stringify(json.errors)}`);
  }
  
  // Store the new data in the cache with the current timestamp.
  apiCache.set(cacheKey, { timestamp: Date.now(), data: json.data });

  return json.data;
}

// Data Transformation from AniList GraphQL format to our internal Media type.
const transformGraphqlMedia = (apiMedia: any): Media => {
    if (!apiMedia || !apiMedia.id) return {} as Media;

    return {
        id: apiMedia.id,
        title: apiMedia.title,
        coverImage: apiMedia.coverImage,
        bannerImage: apiMedia.bannerImage,
        format: apiMedia.format,
        status: apiMedia.status,
        episodes: apiMedia.episodes,
        chapters: apiMedia.chapters,
        averageScore: apiMedia.averageScore,
        description: apiMedia.description || '',
        genres: apiMedia.genres || [],
        isAdult: apiMedia.isAdult,
        nextAiringEpisode: apiMedia.nextAiringEpisode,
    };
};

interface ProcessedPage {
    media: Media[];
    hasNextPage: boolean;
    lastPage?: number;
}

// Helper to process a page of media from a GraphQL response.
const processMediaPage = (data: any): ProcessedPage => {
    const pageData = data?.Page;
    if (!pageData) return { media: [], hasNextPage: false, lastPage: 1 };

    const mediaList = Array.isArray(pageData.media) 
        ? pageData.media.map(transformGraphqlMedia).filter((m: Media) => m.id)
        : [];
    
    const hasNextPage = pageData.pageInfo?.hasNextPage || false;
    const lastPage = pageData.pageInfo?.lastPage;

    return { media: mediaList, hasNextPage, lastPage };
};


// --- Rewritten API Functions ---

export const getTrendingAnime = async (): Promise<Media[]> => {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC) {
          ...media
        }
      }
    }
    ${mediaFragment}
  `;
  const data = await fetchFromGraphQL(query, { page: 1, perPage: 20 });
  return processMediaPage(data).media;
};

export const getPopularAnime = async (): Promise<Media[]> => {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC) {
          ...media
        }
      }
    }
    ${mediaFragment}
  `;
  const data = await fetchFromGraphQL(query, { page: 1, perPage: 20 });
  return processMediaPage(data).media;
};

export const getPopularManga = async (): Promise<Media[]> => {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page(page: $page, perPage: $perPage) {
          media(type: MANGA, sort: POPULARITY_DESC) {
            ...media
          }
        }
      }
      ${mediaFragment}
    `;
    const data = await fetchFromGraphQL(query, { page: 1, perPage: 20 });
    return processMediaPage(data).media;
  };


interface SearchFilters {
    query: string;
    type?: 'ANIME' | 'MANGA';
    formats?: MediaFormat[];
    stati?: MediaStatus[];
    genres?: string[];
    sort?: MediaSort;
    showNsfw?: boolean;
}

export const searchMedia = async (filters: SearchFilters, page: number = 1): Promise<ProcessedPage> => {
  if (!filters.query && !filters.genres?.length) return { media: [], hasNextPage: false };

  const query = `
    query ($page: Int, $perPage: Int, $search: String, $type: MediaType, $sort: [MediaSort], $genre_in: [String], $format_in: [MediaFormat], $status_in: [MediaStatus], $isAdult: Boolean) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          hasNextPage
          lastPage
        }
        media(search: $search, type: $type, sort: $sort, genre_in: $genre_in, format_in: $format_in, status_in: $status_in, isAdult: $isAdult) {
          ...media
        }
      }
    }
    ${mediaFragment}
  `;

  const variables: any = {
      page: page,
      perPage: 30,
      sort: filters.sort ? [filters.sort] : [MediaSort.POPULARITY_DESC],
  };

  if (filters.query) variables.search = filters.query;
  if (filters.type) variables.type = filters.type;
  if (filters.genres?.length) variables.genre_in = filters.genres;
  if (filters.formats?.length) variables.format_in = filters.formats;
  if (filters.stati?.length) variables.status_in = filters.stati;
  if (filters.showNsfw === false) {
    variables.isAdult = false;
  }

  const data = await fetchFromGraphQL(query, variables);
  return processMediaPage(data);
};

export const getMediaDetails = async (mediaId: number): Promise<Media> => {
  const query = `
    query ($id: Int) {
      Media(id: $id) {
        ...media
      }
    }
    ${mediaFragment}
  `;
  const data = await fetchFromGraphQL(query, { id: mediaId });
  return transformGraphqlMedia(data.Media);
};

export const getMultipleMediaDetails = async (ids: number[]): Promise<Media[]> => {
    if (ids.length === 0) return [];
    
    const query = `
      query ($page: Int, $perPage: Int, $id_in: [Int]) {
        Page(page: $page, perPage: $perPage) {
          media(id_in: $id_in, sort: ID) {
            ...media
          }
        }
      }
      ${mediaFragment}
    `;

    // AniList API has a limit of 50 per page. We need to chunk requests if we have more IDs.
    const CHUNK_SIZE = 50;
    const idChunks: number[][] = [];
    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        idChunks.push(ids.slice(i, i + CHUNK_SIZE));
    }

    const promises = idChunks.map(chunk => 
        fetchFromGraphQL(query, {
            id_in: chunk,
            page: 1,
            perPage: CHUNK_SIZE
        }).then(data => processMediaPage(data).media)
    );

    const chunkedResults = await Promise.all(promises);
    return chunkedResults.flat();
};


export const getGenreCollection = async (): Promise<Genre[]> => {
    const query = `
        query {
            GenreCollection
        }
    `;
    const data = await fetchFromGraphQL(query);
    if (data && Array.isArray(data.GenreCollection)) {
        return data.GenreCollection.map((name: string) => ({ name })).sort((a, b) => a.name.localeCompare(b.name));
    }
    return [];
};