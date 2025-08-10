
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../types';
import { getUser } from '../services/anilistService';
import { exchangeCodeForToken } from '../services/contentService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ANILIST_TOKEN_KEY = 'mxd42XrKeUO44wtll2lqfE68vtCo1gyTMdTouF9P';
export const ANILIST_CLIENT_ID = '14401';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const login = useCallback(async (newToken: string) => {
    if (!newToken) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const fetchedUser = await getUser(newToken);
      setUser(fetchedUser);
      setToken(newToken);
      localStorage.setItem(ANILIST_TOKEN_KEY, newToken);
    } catch (error) {
      console.error("Failed to login with token", error);
      setUser(null);
      setToken(null);
      localStorage.removeItem(ANILIST_TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleAuthCallback = async () => {
        const queryParams = new URLSearchParams(window.location.search);
        const authCode = queryParams.get('code');

        if (authCode) {
            setIsLoading(true);
            // Clean the URL immediately to prevent re-triggering
            window.history.replaceState({}, document.title, window.location.pathname);

            try {
                // Exchange the code for a token via our proxy, passing the Client ID
                const accessToken = await exchangeCodeForToken(authCode, ANILIST_CLIENT_ID);
                // Now login with the acquired token
                await login(accessToken);
            } catch (error) {
                console.error("Failed to exchange auth code for token:", error);
                // Clear any partial state and stop loading
                logout(); 
                setIsLoading(false);
            }
            return; // Auth flow handled, no need to check localStorage this time.
        }

        // If no auth code, check for a pre-existing session in local storage
        const storedToken = localStorage.getItem(ANILIST_TOKEN_KEY);
        if (storedToken) {
            await login(storedToken);
        } else {
            setIsLoading(false); // No code, no stored token. We are done loading.
        }
    };

    handleAuthCallback();
  }, [login]);

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(ANILIST_TOKEN_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};