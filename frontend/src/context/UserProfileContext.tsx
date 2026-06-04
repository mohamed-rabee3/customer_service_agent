import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string | null;
}

interface UserProfileContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    name: 'User Name',
    email: 'user@company.com',
    avatarUrl: null,
  });

  useEffect(() => {
    if (!isLoggedIn) {
      setProfile({
        name: 'User Name',
        email: 'user@company.com',
        avatarUrl: null,
      });
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        const data = res.data;
        const name = data.profile?.name || data.name || 'User Name';
        const email = data.email || 'user@company.com';
        const avatarUrl = data.profile?.avatar_url || data.profile?.avatarUrl || null;
        setProfile({
          name,
          email,
          avatarUrl,
        });
      } catch (err) {
        console.error('Failed to fetch user profile details:', err);
      }
    };

    fetchUserProfile();
  }, [isLoggedIn]);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  return (
    <UserProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) throw new Error('useUserProfile must be used within UserProfileProvider');
  return context;
};

