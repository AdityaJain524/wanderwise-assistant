import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Itinerary } from '@/lib/mockData';
import { Json } from '@/integrations/supabase/types';

export interface SavedItinerary {
  id: string;
  title: string;
  itinerary_type: string;
  details: Itinerary;
  total_cost: number | null;
  status: string | null;
  customer_id: string | null;
  conversation_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useItineraries = () => {
  const { user } = useAuth();
  const [itineraries, setItineraries] = useState<SavedItinerary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItineraries = useCallback(async () => {
    // Load from local storage first
    const localData = localStorage.getItem('wanderwise_itineraries');
    if (localData) {
      try {
        setItineraries(JSON.parse(localData));
        setLoading(false);
      } catch (e) {
        console.error('Error parsing local itineraries:', e);
      }
    }

    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('itineraries')
        .select('*')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedData = data.map(itin => ({
          ...itin,
          details: itin.details as unknown as Itinerary,
        }));
        setItineraries(mappedData);
        localStorage.setItem('wanderwise_itineraries', JSON.stringify(mappedData));
      }
    } catch (error) {
      console.warn('Failed to fetch itineraries, using empty list/local:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchItineraries();
  }, [fetchItineraries]);

  const saveItinerary = async (
    itinerary: Itinerary, 
    conversationId?: string,
    customerId?: string
  ): Promise<string | null> => {
    const mockId = `local-itin-${Date.now()}`;
    const mockItin: SavedItinerary = {
      id: mockId,
      title: `${itinerary.type.charAt(0).toUpperCase() + itinerary.type.slice(1)} - ${itinerary.flight.departure.city} to ${itinerary.flight.arrival.city}`,
      itinerary_type: itinerary.type,
      details: itinerary,
      total_cost: itinerary.totalCost,
      status: 'saved',
      customer_id: customerId || null,
      conversation_id: conversationId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistic update
    setItineraries(prev => {
      const newState = [mockItin, ...prev];
      localStorage.setItem('wanderwise_itineraries', JSON.stringify(newState));
      return newState;
    });

    if (!user) return mockId;

    try {
      const { data, error } = await supabase
        .from('itineraries')
        .insert({
          agent_id: user.id,
          title: mockItin.title,
          itinerary_type: itinerary.type,
          details: itinerary as unknown as Json,
          total_cost: itinerary.totalCost,
          status: 'saved',
          conversation_id: conversationId || null,
          customer_id: customerId || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setItineraries(prev => {
          const newState = prev.map(i => i.id === mockId ? { ...data, details: data.details as unknown as Itinerary } : i);
          localStorage.setItem('wanderwise_itineraries', JSON.stringify(newState));
          return newState;
        });
        return data.id;
      }
    } catch (error) {
      console.warn('Failed to save itinerary to Supabase, using local fallback:', error);
      return mockId;
    }
    return null;
  };

  const updateItineraryStatus = async (id: string, status: string) => {
    setItineraries(prev => {
      const newState = prev.map(itin => 
        itin.id === id ? { ...itin, status, updated_at: new Date().toISOString() } : itin
      );
      localStorage.setItem('wanderwise_itineraries', JSON.stringify(newState));
      return newState;
    });

    if (!user) return;

    const { error } = await supabase
      .from('itineraries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('agent_id', user.id);

    if (error) console.warn('Error updating itinerary status in Supabase:', error);
  };

  const updateItineraryCustomer = async (id: string, customerId: string | null) => {
    setItineraries(prev => {
      const newState = prev.map(itin => 
        itin.id === id ? { ...itin, customer_id: customerId, updated_at: new Date().toISOString() } : itin
      );
      localStorage.setItem('wanderwise_itineraries', JSON.stringify(newState));
      return newState;
    });

    if (!user) return;

    const { error } = await supabase
      .from('itineraries')
      .update({ customer_id: customerId, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('agent_id', user.id);

    if (error) console.warn('Error updating itinerary customer in Supabase:', error);
  };

  const deleteItinerary = async (id: string) => {
    setItineraries(prev => {
      const newState = prev.filter(itin => itin.id !== id);
      localStorage.setItem('wanderwise_itineraries', JSON.stringify(newState));
      return newState;
    });

    if (!user) return;

    const { error } = await supabase
      .from('itineraries')
      .delete()
      .eq('id', id)
      .eq('agent_id', user.id);

    if (error) console.warn('Error deleting itinerary from Supabase:', error);
  };

  return {
    itineraries,
    loading,
    saveItinerary,
    updateItineraryStatus,
    updateItineraryCustomer,
    deleteItinerary,
    refetch: fetchItineraries,
  };
};
