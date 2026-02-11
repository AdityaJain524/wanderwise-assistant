import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export type TravelMode = 'bus' | 'train' | 'plane';

interface TravelModeContextType {
  travelMode: TravelMode | null;
  setTravelMode: (mode: TravelMode) => void;
  hasSelectedMode: boolean;
  setHasSelectedMode: (value: boolean) => void;
}

const TravelModeContext = createContext<TravelModeContextType | undefined>(undefined);

export const TravelModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [travelMode, setTravelModeState] = useState<TravelMode | null>(null);
  const [hasSelectedMode, setHasSelectedMode] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Check localStorage first
    const savedMode = localStorage.getItem('preferred_travel_mode') as TravelMode | null;
    const hasSelected = localStorage.getItem('has_selected_travel_mode');
    
    if (savedMode) {
      setTravelModeState(savedMode);
    }
    if (hasSelected === 'true') {
      setHasSelectedMode(true);
    }
  }, []);

  useEffect(() => {
    // Fetch from profile if user is logged in (for future profile support)
    // Currently we only use localStorage, but this can be extended
  }, [user]);

  const setTravelMode = async (mode: TravelMode) => {
    setTravelModeState(mode);
    localStorage.setItem('preferred_travel_mode', mode);
    localStorage.setItem('has_selected_travel_mode', 'true');
    setHasSelectedMode(true);
  };

  return (
    <TravelModeContext.Provider value={{ travelMode, setTravelMode, hasSelectedMode, setHasSelectedMode }}>
      {children}
    </TravelModeContext.Provider>
  );
};

export const useTravelMode = () => {
  const context = useContext(TravelModeContext);
  if (context === undefined) {
    throw new Error('useTravelMode must be used within a TravelModeProvider');
  }
  return context;
};
