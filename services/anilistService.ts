import { Media, MediaList, User, MediaFormat, MediaStatus, MediaSort, MediaListStatus, Genre } from '../types';

const API_URL = 'https://graphql.anilist.co';

// GraphQL Fragments
const mediaFieldsFragment = `
  fragment mediaFields on Media {
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
    format
    status
    episodes
    chapters
    averageScore
    description(asHtml: false)
    genres
    mediaListEntry {
      progress
      score
    }
  }
`;

// API Helper
async function fetchAniList(query: string, variables: object = {}, token?: string | null) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const json = await response.json();

  if (!response.ok) {
    throw new Error(`AniList API Error: ${response.statusText} - ${JSON.stringify(json.errors)}`);
  }
  
  if (json.errors) {
    console.error('AniList GraphQL Errors:', json.errors);
    throw new Error(`AniList GraphQL Error: ${json.errors.map((e: any) => e.message).join(', ')}`);
  }
  return json.data;
}

// Data Transformation
const transformApiMedia = (apiMedia: any): Media => {
    if (!apiMedia) return {} as Media; // Should not happen with correct queries
    return {
        ...apiMedia,
        description: apiMedia.description || '',
        genres: apiMedia.genres || [],
        userProgress: apiMedia.mediaListEntry ? {
            progress: apiMedia.mediaListEntry.progress,
            score: apiMedia.mediaListEntry.score
        } : undefined,
    };
};

const transformEntries = (data: any): MediaList[] => {
    if (!data || !data.MediaListCollection || !data.MediaListCollection.lists) return [];
    return data.MediaListCollection.lists.flatMap((list: any) => 
        list.entries.map((entry: any) => ({
            progress: entry.progress,
            score: entry.score,
            updatedAt: entry.updatedAt,
            media: transformApiMedia(entry.media),
        }))
    );
};


const getMediaPage = async (variables: object, token?: string | null): Promise<Media[]> => {
    const query = `
      query ($page: Int, $perPage: Int, $sort: [MediaSort], $type: MediaType, $search: String, $format_in: [MediaFormat], $status_in: [MediaStatus], $genre_in: [String]) {
        Page(page: $page, perPage: $perPage) {
          media(sort: $sort, type: $type, search: $search, isAdult: false, format_in: $format_in, status_in: $status_in, genre_in: $genre_in) {
            ...mediaFields
          }
        }
      }
      ${mediaFieldsFragment}
    `;
    const data = await fetchAniList(query, variables, token);
    return data.Page.media.map(transformApiMedia);
};

export const getTrendingAnime = async (token?: string | null): Promise<Media[]> => {
  return getMediaPage({ page: 1, perPage: 10, sort: 'TRENDING_DESC', type: 'ANIME' }, token);
};

export const getPopularAnime = async (token?: string | null): Promise<Media[]> => {
  return getMediaPage({ page: 1, perPage: 15, sort: 'POPULARITY_DESC', type: 'ANIME' }, token);
};

export const getPopularManga = async (token?: string | null): Promise<Media[]> => {
  return getMediaPage({ page: 1, perPage: 15, sort: 'POPULARITY_DESC', type: 'MANGA' }, token);
};

interface SearchFilters {
    query: string;
    type?: 'ANIME' | 'MANGA';
    formats?: MediaFormat[];
    stati?: MediaStatus[];
    genres?: string[];
    sort?: MediaSort;
}

export const searchMedia = async (filters: SearchFilters, token?: string | null): Promise<Media[]> => {
  if (!filters.query && !filters.genres?.length) return [];
  const variables = {
    search: filters.query || undefined,
    type: filters.type,
    format_in: filters.formats?.length ? filters.formats : undefined,
    status_in: filters.stati?.length ? filters.stati : undefined,
    genre_in: filters.genres?.length ? filters.genres : undefined,
    sort: filters.sort || MediaSort.POPULARITY_DESC,
    page: 1,
    perPage: 25
  };
  return getMediaPage(variables, token);
};

export const getUser = async (token: string): Promise<User> => {
  const query = `
    query {
      Viewer {
        id
        name
        avatar {
          large
        }
      }
    }
  `;
  const data = await fetchAniList(query, {}, token);
  return data.Viewer;
};

const userMediaListQuery = `
  query ($userId: Int, $type: MediaType, $status_in: [MediaListStatus]) {
    MediaListCollection(userId: $userId, type: $type, status_in: $status_in, sort: UPDATED_TIME_DESC) {
      lists {
        name
        entries {
          progress
          score(format: POINT_100)
          updatedAt
          media {
            ...mediaFields
          }
        }
      }
    }
  }
  ${mediaFieldsFragment}
`;

const fetchUserMediaList = async (userId: number, token: string, status_in: MediaListStatus[]): Promise<MediaList[]> => {
    const animePromise = fetchAniList(userMediaListQuery, { userId, type: 'ANIME', status_in }, token);
    const mangaPromise = fetchAniList(userMediaListQuery, { userId, type: 'MANGA', status_in }, token);

    const [animeData, mangaData] = await Promise.all([animePromise, mangaPromise]);
  
    const animeList = transformEntries(animeData);
    const mangaList = transformEntries(mangaData);
    
    // Sort combined list by update time descending
    return [...animeList, ...mangaList].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export const getUserList = async (userId: number, token: string): Promise<MediaList[]> => {
  return fetchUserMediaList(userId, token, [MediaListStatus.CURRENT, MediaListStatus.REPEATING, MediaListStatus.PLANNING]);
};

export const getUserMediaHistory = async (userId: number, token: string): Promise<MediaList[]> => {
    return fetchUserMediaList(userId, token, [MediaListStatus.CURRENT, MediaListStatus.REPEATING, MediaListStatus.PAUSED, MediaListStatus.COMPLETED]);
};

export const getMediaDetails = async (mediaId: number, format: MediaFormat, token?: string | null): Promise<Media> => {
  const isManga = format === MediaFormat.MANGA || format === MediaFormat.NOVEL || format === MediaFormat.ONE_SHOT;
  const type = isManga ? 'MANGA' : 'ANIME';

  const query = `
    query ($id: Int, $type: MediaType) {
      Media(id: $id, type: $type) {
        ...mediaFields
      }
    }
    ${mediaFieldsFragment}
  `;
  
  const data = await fetchAniList(query, { id: mediaId, type }, token);
  return transformApiMedia(data.Media);
};

export const updateMediaProgress = async (mediaId: number, progress: number, token:string): Promise<any> => {
    const query = `
        mutation ($mediaId: Int, $progress: Int, $status: MediaListStatus) {
            SaveMediaListEntry(mediaId: $mediaId, progress: $progress, status: $status) {
                id
                progress
                status
            }
        }
    `;
    return fetchAniList(query, { mediaId, progress, status: MediaListStatus.CURRENT }, token);
}

export const getGenreCollection = async (): Promise<Genre[]> => {
    const query = `
        query {
            GenreCollection
        }
    `;
    const data = await fetchAniList(query);
    return data.GenreCollection.map((name: string) => ({ name }));
};