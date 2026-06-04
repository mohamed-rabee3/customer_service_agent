import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { settingsAPI } from '../services/settingsService';

// Product defaults — used before login and as a fallback when settings are empty.
export const DEFAULT_COMPANY_NAME = 'OmniServa AI';
export const DEFAULT_TAGLINE = 'Agentic customer service system with human feedback';

interface Brand {
  companyName: string;
  tagline: string;
  logoUrl: string | null;
}

interface BrandContextType {
  brand: Brand;
  /** Push live updates (e.g. after saving on the Settings page) so the brand
   *  shown in the sidebar/login updates without a refresh. */
  updateBrand: (updates: Partial<Brand>) => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const [brand, setBrand] = useState<Brand>({
    companyName: DEFAULT_COMPANY_NAME,
    tagline: DEFAULT_TAGLINE,
    logoUrl: null,
  });

  useEffect(() => {
    if (!isLoggedIn) {
      // Logged out (e.g. login screen) — show the product defaults.
      setBrand({ companyName: DEFAULT_COMPANY_NAME, tagline: DEFAULT_TAGLINE, logoUrl: null });
      return;
    }

    const fetchBrand = async () => {
      try {
        const res = await settingsAPI.get();
        const data = res.data;
        setBrand({
          companyName: data?.companyName || DEFAULT_COMPANY_NAME,
          tagline: data?.tagline || DEFAULT_TAGLINE,
          logoUrl: data?.logoPreview || null,
        });
      } catch (err) {
        console.error('Failed to fetch brand settings:', err);
      }
    };

    fetchBrand();
  }, [isLoggedIn]);

  const updateBrand = useCallback((updates: Partial<Brand>) => {
    setBrand(prev => ({ ...prev, ...updates }));
  }, []);

  return (
    <BrandContext.Provider value={{ brand, updateBrand }}>
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (!context) throw new Error('useBrand must be used within BrandProvider');
  return context;
};
