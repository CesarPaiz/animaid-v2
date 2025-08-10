export enum MediaFormat {
  TV = 'TV',
  TV_SHORT = 'TV_SHORT',
  MOVIE = 'MOVIE',
  SPECIAL = 'SPECIAL',
  OVA = 'OVA',
  ONA = 'ONA',
  MUSIC = 'MUSIC',
  MANGA = 'MANGA',
  NOVEL = 'NOVEL',
  ONE_SHOT = 'ONE_SHOT',
}

export enum MediaStatus {
    FINISHED = 'FINISHED',
    RELEASING = 'RELEASING',
    NOT_YET_RELEASED = 'NOT_YET_RELEASED',
    CANCELLED = 'CANCELLED',
    HIATUS = 'HIATUS',
}

export enum MediaSort {
    ID_DESC = 'ID_DESC',
    SCORE_DESC = 'SCORE_DESC',
    POPULARITY_DESC = 'POPULARITY_DESC',
    TRENDING_DESC = 'TRENDING_DESC',
    FAVOURITES_DESC = 'FAVOURITES_DESC',
    START_DATE_DESC = 'START_DATE_DESC',
}

export enum MediaListStatus {
    CURRENT = 'CURRENT',
    PLANNING = 'PLANNING',
    COMPLETED = 'COMPLETED',
    DROPPED = 'DROPPED',
    PAUSED = 'PAUSED',
    REPEATING = 'REPEATING'
}

export interface MediaTitle {
  romaji: string;
  english?: string;
  native: string;
}

export interface MediaCoverImage {
  extraLarge: string;
  large: string;
  color?: string;
}

export interface Media {
  id: number;
  title: MediaTitle;
  coverImage: MediaCoverImage;
  format: MediaFormat;
  status: MediaStatus;
  episodes?: number;
  chapters?: number;
  averageScore?: number;
  description: string;
  genres: string[];
  userProgress?: {
    progress: number;
    score: number;
  };
}

export interface User {
  id: number;
  name: string;
  avatar: {
    large: string;
  };
}

export interface MediaList {
  media: Media;
  progress: number;
  score: number;
  updatedAt?: number;
}

export interface Genre {
    name: string;
}