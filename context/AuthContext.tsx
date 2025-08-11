


import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { createClient, SupabaseClient, Session, AuthUser } from '@supabase/supabase-js';
import { User, Media, MediaList, MediaListStatus } from '../types';
import { getMultipleMediaDetails } from '../services/anilistService';

// --- Supabase Schema Definition ---
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
          status: 'CURRENT' | 'PLANNING' | 'COMPLETED' | 'DROPPED' | 'PAUSED' | 'REPEATING';
          media_type: "ANIME" | "MANGA";
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          media_id: number;
          progress: number;
          score?: number | null;
          status: 'CURRENT' | 'PLANNING' | 'COMPLETED' | 'DROPPED' | 'PAUSED' | 'REPEATING';
          media_type: "ANIME" | "MANGA";
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          media_id?: number;
          progress?: number;
          score?: number | null;
          status?: 'CURRENT' | 'PLANNING' | 'COMPLETED' | 'DROPPED' | 'PAUSED' | 'REPEATING';
          media_type?: "ANIME" | "MANGA";
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      media_list_status: 'CURRENT' | 'PLANNING' | 'COMPLETED' | 'DROPPED' | 'PAUSED' | 'REPEATING';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// --- Type Aliases ---
type MediaEntryRow = Database['public']['Tables']['media_entries']['Row'];
type MediaEntryInsert = Database['public']['Tables']['media_entries']['Insert'];


// --- Supabase Client Initialization ---
// The application code expects SUPABASE_URL and SUPABASE_ANON_KEY to be available
// as environment variables.
const supabaseUrl = "https://bhlhsvfgvfghgjwwdwzc.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJobGhzdmZndmZnaGdqd3dkd3pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NzM3NzQsImV4cCI6MjA3MDQ0OTc3NH0.ehcx-B1VhfKa5TFbpPcpkecB1cBIDUIHzTnNha372CY";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key are not configured in environment variables.");
}

export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseAnonKey);


// --- Types ---
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
    score?: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signIn: (email: string, pass: string) => Promise<any>;
  signOut: () => Promise<void>;
  authStatus: AuthStatus;
  clearAuthStatus: () => void;
  getMediaEntry: (mediaId: number) => Promise<MediaEntryRow | null>;
  upsertMediaEntry: (entry: MediaEntryUpsert) => Promise<MediaEntryRow | null>;
  getLibraryList: () => Promise<MediaList[]>;
  getFullLibraryList: () => Promise<MediaList[]>;
  getHistoryList: () => Promise<MediaList[]>;
  isDebugMode: boolean;
  toggleDebugMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- AuthProvider Component ---
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isLoading: true,
    message: null,
    isError: false,
  });
  const [isDebugMode, setIsDebugMode] = useState<boolean>(() => {
    try {
      const item = window.localStorage.getItem('debugMode');
      return item ? JSON.parse(item) : false;
    } catch (error) {
      return false;
    }
  });

  const toggleDebugMode = useCallback(() => {
    setIsDebugMode(prev => {
        const newState = !prev;
        try {
            window.localStorage.setItem('debugMode', JSON.stringify(newState));
        } catch (error) {
            console.error("Could not save debug mode to localStorage", error);
        }
        return newState;
    });
  }, []);

  const clearAuthStatus = useCallback(() => {
    setAuthStatus(prev => ({ ...prev, message: null, isError: false }));
  }, []);

  const handleUser = useCallback(async (authUser: AuthUser | null) => {
    if (authUser) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`username, avatar_url`)
        .eq('id', authUser.id)
        .single();
      
      if (error) console.error("Error fetching profile:", error);
      
      setUser({
        id: authUser.id,
        email: authUser.email,
        username: profile?.username || 'Invitado',
        avatar_url: profile?.avatar_url || undefined
      });
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const fetchSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        await handleUser(session?.user ?? null);
        setAuthStatus(prev => ({ ...prev, isLoading: false }));
    };
    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        await handleUser(session?.user ?? null);
        setAuthStatus(prev => ({ ...prev, isLoading: false }));
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [handleUser]);

  const signIn = useCallback(async (email: string, pass: string) => {
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
    setAuthStatus({ isLoading: true, message: 'Cerrando sesión...', isError: false });
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setAuthStatus({ isLoading: false, message: null, isError: false });
  }, []);
  
  const getMediaEntry = useCallback(async (mediaId: number): Promise<MediaEntryRow | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('media_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('media_id', mediaId)
        .single();
      if (error && error.code !== 'PGRST116') { // Ignore 'exact one row' error
        console.error("Error fetching media entry:", error);
      }
      return data;
  }, [user]);
  
  const upsertMediaEntry = useCallback(async (entry: MediaEntryUpsert): Promise<MediaEntryRow | null> => {
      if (!user) return null;

      const entryToUpsert: MediaEntryInsert = {
          ...entry,
          user_id: user.id
      };
      
      const { data, error } = await supabase
          .from('media_entries')
          .upsert(entryToUpsert, { onConflict: 'user_id,media_id' })
          .select()
          .single();

      if (error) {
        console.error('Error upserting media entry:', error);
        return null;
      }
      return data;
  }, [user]);

  const fetchAndMergeMedia = useCallback(async (entries: MediaEntryRow[]): Promise<MediaList[]> => {
      if (!entries || entries.length === 0) return [];
      const mediaIds = entries.map(e => e.media_id);
      const mediaDetailsList = await getMultipleMediaDetails(mediaIds);
      const mediaDetailsMap = new Map(mediaDetailsList.map(m => [m.id, m]));
      
      return entries.map((entry): MediaList | null => {
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
      }).filter((item): item is MediaList => item !== null)
        .sort((a,b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, []);
  
  const getLibraryList = useCallback(async (): Promise<MediaList[]> => {
      if (!user) return [];
      const { data: entries, error } = await supabase
          .from('media_entries')
          .select('*')
          .eq('user_id', user.id)
          .in('status', [MediaListStatus.CURRENT, MediaListStatus.REPEATING, MediaListStatus.PLANNING]);
      if (error) { console.error(error); return []; }
      return fetchAndMergeMedia(entries || []);
  }, [user, fetchAndMergeMedia]);
  
  const getFullLibraryList = useCallback(async (): Promise<MediaList[]> => {
    if (!user) return [];
    const { data: entries, error } = await supabase
        .from('media_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
        
    if (error) { 
        console.error("Error fetching full library list:", error); 
        return []; 
    }
    return fetchAndMergeMedia(entries || []);
  }, [user, fetchAndMergeMedia]);

  const getHistoryList = useCallback(async (): Promise<MediaList[]> => {
      if (!user) return [];
      const { data: entries, error } = await supabase
          .from('media_entries')
          .select('*')
          .eq('user_id', user.id)
          .in('status', [MediaListStatus.CURRENT, MediaListStatus.REPEATING, MediaListStatus.PAUSED, MediaListStatus.COMPLETED])
          .order('updated_at', { ascending: false })
          .limit(50);
      if (error) { console.error(error); return []; }
      return fetchAndMergeMedia(entries || []);
  }, [user, fetchAndMergeMedia]);

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
      isDebugMode,
      toggleDebugMode
    }), [
      user, session, signIn, signOut, authStatus, clearAuthStatus, getMediaEntry, upsertMediaEntry, getLibraryList, getFullLibraryList, getHistoryList, isDebugMode, toggleDebugMode
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Custom Hook ---
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};