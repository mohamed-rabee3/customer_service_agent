import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import api from '../services/api';

export type UserRole = 'admin' | 'supervisor';
export type SupervisorType = 'voice' | 'chat';

interface UserProfile {
  id: string;
  role: UserRole;
  supervisor_type?: SupervisorType;
  email?: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  role: UserRole;
  supervisorType: SupervisorType;
  userId: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [role, setRole] = useState<UserRole>('supervisor');
  const [supervisorType, setSupervisorType] = useState<SupervisorType>('voice');
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch user profile from backend
  const fetchProfile = async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await api.get('/auth/me');
      // The backend returns { id, role, email, profile: { supervisor_type, ... } }
      const data = res.data;
      setRole(data.role);
      setUserId(data.id);
      
      const supType = data.profile?.supervisor_type || data.supervisor_type;
      if (data.role === 'supervisor' && supType) {
        setSupervisorType(supType);
      }
      setIsLoggedIn(true);
      return { ok: true };
    } catch (err: unknown) {
      setIsLoggedIn(false);
      const axiosErr = err as { response?: { data?: { detail?: unknown }; status?: number }; code?: string; message?: string };
      const detail = axiosErr?.response?.data?.detail;
      let message = 'Failed to load profile.';
      if (typeof detail === 'string' && detail.trim()) {
        message = detail;
      } else if (!axiosErr.response) {
        message = 'Cannot reach the API server. Make sure the backend is running on http://localhost:8000.';
      }
      return { ok: false, error: message };
    }
  };

  // Check existing session on mount
  useEffect(() => {
    let resolved = false;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && !resolved) {
          const profile = await fetchProfile();
          if (!profile.ok) {
            await supabase.auth.signOut();
          }
        }
      } catch {
        // Supabase unreachable — proceed to login
      }
      if (!resolved) {
        resolved = true;
        setIsLoading(false);
      }
    };

    // Safety net: always stop loading after 3 seconds
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        setIsLoading(false);
      }
    }, 3000);

    init();

    // Listen for Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false);
        setUserId(null);
        setRole('supervisor');
        setSupervisorType('voice');
        localStorage.clear();
        sessionStorage.clear();
      }
    });

    // Listen for Axios 401 interceptor events
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, error: error.message };
      const profile = await fetchProfile();
      if (!profile.ok) {
        await supabase.auth.signOut();
        return { success: false, error: profile.error || 'Failed to load profile.' };
      }
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err?.message || 'Login failed' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    sessionStorage.clear();
    setIsLoggedIn(false);
    setUserId(null);
    setRole('supervisor');
    setSupervisorType('voice');
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, role, supervisorType, userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
