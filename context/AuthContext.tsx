import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { createClient, type SupabaseClient, type Session, type User as AuthUser, type AuthError } from '@supabase/supabase-js';
import { User, Media, MediaList, MediaListStatus, ScheduledMediaList } from '../types';
import { getMultipleMediaDetails } from '../services/anilistService';

export type Database = {
  public: {
    Tables: {
      media_entries: {
        Row: {
          id: number;
          user_id: string;
          media_id: number;
          progress: number;
          score: number | null;
          status: MediaListStatus;
          media_type: 'ANIME' | 'MANGA';
          updated_at: string;
        };
        Insert: {
          user_id: string;
          media_id: number;
          progress: number;
          score?: number | null;
          status: MediaListStatus;
          media_type: 'ANIME' | 'MANGA';
        };
        Update: {
          id?: number;
          user_id?: string;
          media_id?: number;
          progress?: number;
          score?: number | null;
          status?: MediaListStatus;
          media_type?: 'ANIME' | 'MANGA';
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          username?: string | null;
          avatar_url?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          username?: string | null;
          avatar_url?: string | null;
          updated_at?: string | null;
        };
      };
      scheduled_media: {
         Row: {
          id: number;
          user_id: string;
          media_id: number;
          scheduled_date: string; // date as 'YYYY-MM-DD'
          created_at: string;
        };
        Insert: {
          user_id: string;
          media_id: number;
          scheduled_date: string;
        };
        Update: {
          scheduled_date?: string;
        };
      }
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};


type MediaEntryRow = Database['public']['Tables']['media_entries']['Row'];
type MediaEntryInsert = Database['public']['Tables']['media_entries']['Insert'];
type ScheduledMediaRow = Database['public']['Tables']['scheduled_media']['Row'];

const supabaseUrl = "https://bhlhsvfgvfghgjwwdwzc.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJobGhzdmZndmZnaGdqd3dkd3pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NzM3NzQsImV4cCI6MjA3MDQ0OTc3NH0.ehcx-B1VhfKa5TFbpPcpkecB1cBIDUIHzTnNha372CY";

export const supabase: SupabaseClient<Database> | null = 
  (supabaseUrl && supabaseAnonKey) 
    ? createClient<Database>(supabaseUrl, supabaseAnonKey)
    : null;

const _fetchAndMergeMedia = async (entries: MediaEntryRow[]): Promise<MediaList[]> => {
    if (!entries || entries.length === 0) return [];
    const mediaIds = entries.map(e => e.media_id);
    const mediaDetailsList = await getMultipleMediaDetails(mediaIds);
    const mediaDetailsMap = new Map(mediaDetailsList.map(m => [m.id, m]));

    const mergedList = entries.map((entry): MediaList | null => {
        const mediaFromMap = mediaDetailsMap.get(entry.media_id);
        if (!mediaFromMap) return null;

        const mediaWithProgress: Media = {
            ...mediaFromMap,
            userProgress: {
                progress: entry.progress,
                score: entry.score ?? 0,
                status: entry.status,
            }
        };

        return {
            media: mediaWithProgress,
            progress: entry.progress,
            score: entry.score ?? 0,
            status: entry.status,
            updatedAt: new Date(entry.updated_at).getTime() / 1000
        };
    }).filter((item): item is MediaList => item !== null);

    return mergedList.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
};

interface AuthStatus {
  isLoading: boolean;
  message: string | null;
  isError: boolean;
}

interface MediaEntryUpsert {
    media_id: number;
    progress: number;
    status: MediaListStatus;
    media_type: 'ANIME' | 'MANGA';
    score?: number | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, pass: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  authStatus: AuthStatus;
  clearAuthStatus: () => void;
  getMediaEntry: (mediaId: number) => Promise<MediaEntryRow | null>;
  upsertMediaEntry: (entry: MediaEntryUpsert) => Promise<MediaEntryRow | null>;
  getFullLibraryList: () => Promise<MediaList[]>;
  getHistoryList: () => Promise<MediaList[]>;
  getScheduledForDateRange: (startDate: string, endDate: string) => Promise<ScheduledMediaList[]>;
  removeMediaFromSchedule: (scheduleId: number) => Promise<boolean>;
  addMediaToSchedule: (mediaId: number, date: string) => Promise<ScheduledMediaList | null>;
  isDebugMode: boolean;
  toggleDebugMode: () => void;
  showNsfw: boolean;
  toggleShowNsfw: () => void;
  isSupabaseConfigured: boolean;
  isForceReloading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ isLoading: true, message: null, isError: false });
  const [isDebugMode, setIsDebugMode] = useState(() => localStorage.getItem('animaid_debug') === 'true');
  const [showNsfw, setShowNsfw] = useState(() => localStorage.getItem('animaid_showNsfw') === 'true');
  const [isForceReloading, setIsForceReloading] = useState(false);
  
  const sessionRef = React.useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const isSupabaseConfigured = useMemo(() => !!supabase, []);

  useEffect(() => {
    if (!supabase) {
      setAuthStatus({ isLoading: false, message: "Supabase not configured", isError: true });
      return;
    }

    const forceReloadTimeout = setTimeout(() => {
        setIsForceReloading(true);
        setTimeout(() => window.location.reload(), 1500); 
    }, 7000);

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("Error getting session:", error);
        clearTimeout(forceReloadTimeout);
        setAuthStatus({ isLoading: false, message: 'Failed to connect to authentication service.', isError: true });
        return;
      }
      clearTimeout(forceReloadTimeout);
      setSession(data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (JSON.stringify(session) !== JSON.stringify(sessionRef.current)) {
          setSession(session);
      }
    });

    return () => {
      subscription?.unsubscribe();
      clearTimeout(forceReloadTimeout);
    };
  }, []);

  useEffect(() => {
    if (session) {
      const authUser = session.user;
      supabase
        .from('profiles')
        .select(`username, avatar_url`)
        .eq('id', authUser.id)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching user profile:', error);
            setAuthStatus({ isLoading: false, message: 'Could not load user profile.', isError: true });
          } else if (data) {
            setUser({
              id: authUser.id,
              username: data.username || 'User',
              avatar_url: data.avatar_url || undefined,
              email: authUser.email,
            });
            setAuthStatus({ isLoading: false, message: null, isError: false });
          }
        });
    } else {
      setUser(null);
      setAuthStatus({ isLoading: false, message: null, isError: false });
    }
  }, [session]);

  const signIn = useCallback(async (email: string, pass: string) => {
    if (!supabase) return { error: { message: "Supabase not configured" } as AuthError };
    
    setAuthStatus({ isLoading: true, message: "Iniciando sesión...", isError: false });
    
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: pass,
    });
    
    if (error) {
      setAuthStatus({ isLoading: false, message: `Error: ${error.message}`, isError: true });
    }
    
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const clearAuthStatus = useCallback(() => setAuthStatus({ isLoading: false, message: null, isError: false }), []);
  
  const getMediaEntry = useCallback(async (mediaId: number): Promise<MediaEntryRow | null> => {
      if (!user || !supabase) return null;
      const { data, error } = await supabase.from('media_entries').select('*').eq('user_id', user.id).eq('media_id', mediaId).single();
      if (error && error.code !== 'PGRST116') console.error("Error fetching media entry:", error);
      return data;
  }, [user]);

  const upsertMediaEntry = useCallback(async (entry: MediaEntryUpsert): Promise<MediaEntryRow | null> => {
      if (!user || !supabase) throw new Error("User not authenticated");

      const { data, error } = await supabase.from('media_entries')
          .upsert({ user_id: user.id, ...entry }, { onConflict: 'user_id, media_id' })
          .select()
          .single();

      if (error) {
          console.error("Error upserting media entry:", error);
          throw error;
      }
      return data;
  }, [user]);

  const getFullLibraryList = useCallback(async (): Promise<MediaList[]> => {
      if (!user || !supabase) return [];
      const { data, error } = await supabase.from('media_entries').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
      if (error) { console.error(error); return []; }
      return _fetchAndMergeMedia(data);
  }, [user]);

  const getHistoryList = useCallback(async (): Promise<MediaList[]> => {
    if (!user || !supabase) return [];
    const { data, error } = await supabase
        .from('media_entries')
        .select('*')
        .eq('user_id', user.id)
        .gt('progress', 0)
        .order('updated_at', { ascending: false })
        .limit(30);
    if (error) { console.error(error); return []; }
    return _fetchAndMergeMedia(data);
  }, [user]);

  const getScheduledForDateRange = useCallback(async (startDate: string, endDate: string) => {
    if (!user || !supabase) return [];
    const { data, error } = await supabase.from('scheduled_media')
        .select('*')
        .eq('user_id', user.id)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate);
    
    if (error) {
        console.error("Error fetching schedule:", error);
        return [];
    }

    const mediaIds = data.map(item => item.media_id);
    if (mediaIds.length === 0) return [];

    const mediaDetails = await getMultipleMediaDetails(mediaIds);
    const mediaMap = new Map(mediaDetails.map(m => [m.id, m]));

    return data.map(item => ({
        scheduleId: item.id,
        media: mediaMap.get(item.media_id)!,
        scheduledDate: item.scheduled_date
    })).filter(item => item.media);
  }, [user]);

  const removeMediaFromSchedule = useCallback(async (scheduleId: number) => {
    if (!user || !supabase) return false;
    const { error } = await supabase.from('scheduled_media').delete().eq('id', scheduleId).eq('user_id', user.id);
    if (error) {
        console.error("Error removing from schedule:", error);
        return false;
    }
    return true;
  }, [user]);

  const addMediaToSchedule = useCallback(async (mediaId: number, date: string) => {
    if (!user || !supabase) return null;
    const { data, error } = await supabase.from('scheduled_media')
        .insert({ user_id: user.id, media_id: mediaId, scheduled_date: date })
        .select()
        .single();
    if (error) {
        console.error("Error adding to schedule:", error);
        return null;
    }
    const media = await getMultipleMediaDetails([mediaId]);
    return { scheduleId: data.id, scheduledDate: data.scheduled_date, media: media[0] };
  }, [user]);

  const toggleDebugMode = useCallback(() => {
    setIsDebugMode(prev => {
        const newState = !prev;
        localStorage.setItem('animaid_debug', String(newState));
        return newState;
    });
  }, []);

  const toggleShowNsfw = useCallback(() => {
      setShowNsfw(prev => {
        const newState = !prev;
        localStorage.setItem('animaid_showNsfw', String(newState));
        return newState;
      });
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    signIn,
    signOut,
    authStatus,
    clearAuthStatus,
    getMediaEntry,
    upsertMediaEntry,
    getFullLibraryList,
    getHistoryList,
    getScheduledForDateRange,
    removeMediaFromSchedule,
    addMediaToSchedule,
    isDebugMode,
    toggleDebugMode,
    showNsfw,
    toggleShowNsfw,
    isSupabaseConfigured,
    isForceReloading
  }), [user, session, signIn, signOut, authStatus, getMediaEntry, upsertMediaEntry, getFullLibraryList, getHistoryList, getScheduledForDateRange, removeMediaFromSchedule, addMediaToSchedule, isDebugMode, toggleDebugMode, showNsfw, toggleShowNsfw, isSupabaseConfigured, isForceReloading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
