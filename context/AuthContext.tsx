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
          status: string;
          media_type: string;
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
      media_schedule: {
        Row: {
          id: number;
          user_id: string;
          media_id: number;
          scheduled_date: string; // YYYY-MM-DD
          created_at: string;
        };
        Insert: {
          user_id: string;
          media_id: number;
          scheduled_date: string; // YYYY-MM-DD
        };
        Update: {
          scheduled_date?: string;
        };
      };
    };
  };
};


type MediaEntryRow = Database['public']['Tables']['media_entries']['Row'];
type MediaEntryInsert = Database['public']['Tables']['media_entries']['Insert'];
type MediaScheduleRow = Database['public']['Tables']['media_schedule']['Row'];

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
                status: entry.status as MediaListStatus,
            }
        };

        return {
            media: mediaWithProgress,
            progress: entry.progress,
            score: entry.score ?? 0,
            status: entry.status as MediaListStatus,
            updatedAt: new Date(entry.updated_at).getTime() / 1000
        };
    }).filter((item): item is MediaList => item !== null);

    return mergedList.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
};

const _fetchAndMergeScheduledMedia = async (entries: MediaScheduleRow[]): Promise<ScheduledMediaList[]> => {
    if (!entries || entries.length === 0) return [];
    const mediaIds = entries.map(e => e.media_id);
    const mediaDetailsList = await getMultipleMediaDetails(mediaIds);
    const mediaDetailsMap = new Map(mediaDetailsList.map(m => [m.id, m]));

    return entries.map((entry): ScheduledMediaList | null => {
        const media = mediaDetailsMap.get(entry.media_id);
        if (!media) return null;

        return {
            scheduleId: entry.id,
            media,
            scheduledDate: entry.scheduled_date,
        };
    }).filter((item): item is ScheduledMediaList => item !== null);
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
  getLibraryList: () => Promise<MediaList[]>;
  getFullLibraryList: () => Promise<MediaList[]>;
  getHistoryList: () => Promise<MediaList[]>;
  getScheduledForDateRange: (startDate: string, endDate: string) => Promise<ScheduledMediaList[]>;
  removeMediaFromSchedule: (scheduleId: number) => Promise<boolean>;
  isDebugMode: boolean;
  toggleDebugMode: () => void;
  showNsfw: boolean;
  toggleShowNsfw: () => void;
  isSupabaseConfigured: boolean;
  isForceReloading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isLoading: true,
    message: null,
    isError: false,
  });
  const [isForceReloading, setIsForceReloading] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState<boolean>(() => {
    try {
      const item = window.localStorage.getItem('debugMode');
      return item ? JSON.parse(item) === true : false;
    } catch (error) {
      console.error("Error al leer 'debugMode' desde localStorage:", error);
      return false;
    }
  });
  const [showNsfw, setShowNsfw] = useState<boolean>(() => {
    try {
      const item = window.localStorage.getItem('showNsfw');
      return item ? JSON.parse(item) === true : false;
    } catch (error) {
      console.error("Error al leer 'showNsfw' desde localStorage:", error);
      return false;
    }
  });
  const isSupabaseConfigured = !!supabase;

  const toggleDebugMode = useCallback(() => {
    setIsDebugMode(prev => {
        const newState = !prev;
        try {
            window.localStorage.setItem('debugMode', JSON.stringify(newState));
        } catch (error) {
            console.error("No se pudo guardar 'debugMode' en localStorage:", error);
        }
        return newState;
    });
  }, []);

  const toggleShowNsfw = useCallback(() => {
    setShowNsfw(prev => {
      const newState = !prev;
      try {
        window.localStorage.setItem('showNsfw', JSON.stringify(newState));
      } catch (error) {
        console.error("No se pudo guardar 'showNsfw' en localStorage:", error);
      }
      return newState;
    });
  }, []);

  const clearAuthStatus = useCallback(() => {
    setAuthStatus(prev => {
        if (prev.message === null && !prev.isError) return prev;
        return { ...prev, message: null, isError: false };
    });
  }, []);

  const handleUser = useCallback(async (authUser: AuthUser | null) => {
    if (authUser && supabase) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`username, avatar_url`)
        .eq('id', authUser.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error al obtener el perfil de usuario:", error)
      };
      
      const newUser = {
        id: authUser.id,
        email: authUser.email,
        username: profile?.username || 'Invitado',
        avatar_url: profile?.avatar_url || undefined
      };
      
      setUser(currentUser => {
          if (JSON.stringify(currentUser) === JSON.stringify(newUser)) {
              return currentUser;
          }
          return newUser;
      });
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const authTimeout = setTimeout(() => {
        console.warn("La autenticación está tardando más de 7 segundos. Forzando una recarga de la página.");
        setIsForceReloading(true);
        setTimeout(() => {
            window.location.reload();
        }, 2000); 
    }, 7000); 

    const fetchSession = async () => {
        if (!supabase) {
            setAuthStatus(prev => ({ ...prev, isLoading: false }));
            clearTimeout(authTimeout); 
            return;
        }
        try {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            await handleUser(session?.user ?? null);
        } catch (error) {
            console.error("Error al obtener la sesión en la carga inicial:", error);
            setSession(null);
            setUser(null);
        } finally {
            setAuthStatus(prev => ({ ...prev, isLoading: false }));
            clearTimeout(authTimeout);
        }
    };
    
    fetchSession();

    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        clearTimeout(authTimeout); 
        setSession(session);
        await handleUser(session?.user ?? null);
        setAuthStatus(prev => ({ ...prev, isLoading: false }));
      }
    );

    return () => {
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, [handleUser]);

  const signIn = useCallback(async (email: string, pass: string) => {
    if (!supabase) {
        setAuthStatus({ isLoading: false, message: "Error: Supabase no está configurado.", isError: true });
        return { error: { message: "Supabase client is not initialized." } as AuthError };
    }
    setAuthStatus({ isLoading: true, message: 'Iniciando sesión...', isError: false });
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      setAuthStatus({ isLoading: false, message: error.message, isError: true });
    } else {
      setAuthStatus({ isLoading: false, message: '¡Sesión iniciada!', isError: false });
      setTimeout(clearAuthStatus, 2000);
    }
    return { error };
  }, [clearAuthStatus]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    setAuthStatus({ isLoading: true, message: 'Cerrando sesión...', isError: false });
    await supabase.auth.signOut();
    setAuthStatus({ isLoading: false, message: null, isError: false });
  }, []);
  
  const getMediaEntry = useCallback(async (mediaId: number): Promise<MediaEntryRow | null> => {
      if (!user || !supabase) return null;
      const { data, error } = await supabase
        .from('media_entries')
        .select('id, user_id, media_id, progress, score, status, media_type, updated_at')
        .eq('user_id', user.id)
        .eq('media_id', mediaId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error al obtener la entrada de media:", error);
      }
      return data;
  }, [user]);
  
  const upsertMediaEntry = useCallback(async (entry: MediaEntryUpsert): Promise<MediaEntryRow | null> => {
      if (!user || !supabase) return null;
      const entryToUpsert: MediaEntryInsert = {
          user_id: user.id,
          media_id: entry.media_id,
          progress: entry.progress,
          score: entry.score ?? null,
          status: entry.status,
          media_type: entry.media_type,
      };
      
      const { data, error } = await supabase
          .from('media_entries')
          .upsert(entryToUpsert, { onConflict: 'user_id,media_id' })
          .select('id, user_id, media_id, progress, score, status, media_type, updated_at')
          .single();

      if (error) {
        console.error('Error al actualizar/insertar la entrada de media:', error);
        return null;
      }
      return data;
  }, [user]);

  const getLibraryList = useCallback(async (): Promise<MediaList[]> => {
      if (!user || !supabase) return [];
      const { data: entries, error } = await supabase
          .from('media_entries')
          .select('id, user_id, media_id, progress, score, status, media_type, updated_at')
          .eq('user_id', user.id)
          .in('status', ['CURRENT', 'REPEATING', 'PLANNING']);
      if (error) { console.error(error); return []; }
      return _fetchAndMergeMedia(entries || []);
  }, [user]);
  
  const getFullLibraryList = useCallback(async (): Promise<MediaList[]> => {
    if (!user || !supabase) return [];
    const { data: entries, error } = await supabase
        .from('media_entries')
        .select('id, user_id, media_id, progress, score, status, media_type, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
        
    if (error) { 
        console.error("Error al obtener la librería completa:", error); 
        return []; 
    }
    return _fetchAndMergeMedia(entries || []);
  }, [user]);

  const getHistoryList = useCallback(async (): Promise<MediaList[]> => {
      if (!user || !supabase) return [];
      const { data: entries, error } = await supabase
          .from('media_entries')
          .select('id, user_id, media_id, progress, score, status, media_type, updated_at')
          .eq('user_id', user.id)
          .in('status', ['CURRENT', 'REPEATING', 'PAUSED', 'COMPLETED'])
          .order('updated_at', { ascending: false })
          .limit(50);
      if (error) { console.error(error); return []; }
      return _fetchAndMergeMedia(entries || []);
  }, [user]);

  const getScheduledForDateRange = useCallback(async (startDate: string, endDate: string): Promise<ScheduledMediaList[]> => {
    if (!user || !supabase) return [];
    const { data: entries, error } = await supabase
        .from('media_schedule')
        .select('*')
        .eq('user_id', user.id)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('scheduled_date', { ascending: true });
    
    if (error) {
        console.error("Error fetching schedule:", error);
        return [];
    }
    return _fetchAndMergeScheduledMedia(entries || []);
  }, [user]);

  const removeMediaFromSchedule = useCallback(async (scheduleId: number): Promise<boolean> => {
      if (!user || !supabase) return false;
      const { error } = await supabase
          .from('media_schedule')
          .delete()
          .eq('id', scheduleId)
          .eq('user_id', user.id);
      
      if (error) {
          console.error("Error removing from schedule:", error);
          return false;
      }
      return true;
  }, [user]);

  const value = useMemo(() => ({ 
      user, 
      session, 
      signIn, 
      signOut, 
      authStatus, 
      clearAuthStatus, 
      getMediaEntry, 
      upsertMediaEntry, 
      getLibraryList,
      getFullLibraryList, 
      getHistoryList,
      getScheduledForDateRange,
      removeMediaFromSchedule,
      isDebugMode,
      toggleDebugMode,
      showNsfw,
      toggleShowNsfw,
      isSupabaseConfigured,
      isForceReloading,
    }), [
      user, session, signIn, signOut, authStatus, clearAuthStatus, getMediaEntry, upsertMediaEntry, getLibraryList, getFullLibraryList, getHistoryList, getScheduledForDateRange, removeMediaFromSchedule, isDebugMode, toggleDebugMode, showNsfw, toggleShowNsfw, isSupabaseConfigured, isForceReloading
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};