import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTranslation } from '@/lib/languages';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
  hasSelectedLanguage: boolean;
  setHasSelectedLanguage: (value: boolean) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState('en');
  const [hasSelectedLanguage, setHasSelectedLanguage] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Check localStorage first
    const savedLang = localStorage.getItem('preferred_language');
    const hasSelected = localStorage.getItem('has_selected_language');
    
    if (savedLang) {
      setLanguageState(savedLang);
    }
    if (hasSelected === 'true') {
      setHasSelectedLanguage(true);
    }
  }, []);

  useEffect(() => {
    // Fetch from profile if user is logged in
    if (user) {
      const fetchLanguage = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('preferred_language')
          .eq('user_id', user.id)
          .single();
        
        if (data?.preferred_language && data.preferred_language !== 'en') {
          setLanguageState(data.preferred_language);
          setHasSelectedLanguage(true);
        }
      };
      fetchLanguage();
    }
  }, [user]);

  const setLanguage = async (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('preferred_language', lang);
    localStorage.setItem('has_selected_language', 'true');
    setHasSelectedLanguage(true);

    // Update profile if user is logged in
    if (user) {
      await supabase
        .from('profiles')
        .update({ preferred_language: lang })
        .eq('user_id', user.id);
    }
  };

  const t = (key: string): string => getTranslation(language, key);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, hasSelectedLanguage, setHasSelectedLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};