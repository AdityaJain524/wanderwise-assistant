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
    if (!user) return;

    const { data, error } = await supabase
      .from('itineraries')
      .select('*')
      .eq('agent_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setItineraries(data.map(itin => ({
        ...itin,
        details: itin.details as unknown as Itinerary,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchItineraries();
  }, [fetchItineraries]);

  const saveItinerary = async (
    itinerary: Itinerary, 
    conversationId?: string,
    customerId?: string
  ): Promise<string | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('itineraries')
      .insert({
        agent_id: user.id,
        title: `${itinerary.type.charAt(0).toUpperCase() + itinerary.type.slice(1)} - ${itinerary.flight.departure.city} to ${itinerary.flight.arrival.city}`,
        itinerary_type: itinerary.type,
        details: itinerary as unknown as Json,
        total_cost: itinerary.totalCost,
        status: 'saved',
        conversation_id: conversationId || null,
        customer_id: customerId || null,
      })
      .select()
      .single();

    if (!error && data) {
      setItineraries(prev => [{
        ...data,
        details: data.details as unknown as Itinerary,
      }, ...prev]);
      return data.id;
    }
    return null;
  };

  const updateItineraryStatus = async (id: string, status: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('itineraries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('agent_id', user.id);

    if (!error) {
      setItineraries(prev => prev.map(itin => 
        itin.id === id ? { ...itin, status } : itin
      ));
    }
  };

  const updateItineraryCustomer = async (id: string, customerId: string | null) => {
    if (!user) return;

    const { error } = await supabase
      .from('itineraries')
      .update({ customer_id: customerId, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('agent_id', user.id);

    if (!error) {
      setItineraries(prev => prev.map(itin => 
        itin.id === id ? { ...itin, customer_id: customerId } : itin
      ));
    }
  };

  const deleteItinerary = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('itineraries')
      .delete()
      .eq('id', id)
      .eq('agent_id', user.id);

    if (!error) {
      setItineraries(prev => prev.filter(itin => itin.id !== id));
    }
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
