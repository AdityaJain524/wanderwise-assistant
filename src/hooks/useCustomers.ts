import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';

export interface CustomerPreferences {
  budgetSensitivity: number;
  preferredAirlines: string[];
  hotelType: 'budget' | 'standard' | 'luxury' | 'any';
  comfortPriority: number;
  mealPreference: string;
  seatPreference: string;
  specialNeeds: string[];
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  preferences: CustomerPreferences | null;
  created_at?: string;
}

export const useCustomers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    // Try loading from local storage first for immediate display
    const localData = localStorage.getItem('wanderwise_customers');
    if (localData) {
      try {
        setCustomers(JSON.parse(localData));
        setLoading(false);
      } catch (e) {
        console.error('Error parsing local customers:', e);
      }
    }

    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('agent_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const mappedData = data.map(c => ({
          ...c,
          preferences: c.preferences as unknown as CustomerPreferences | null,
        }));
        setCustomers(mappedData);
        localStorage.setItem('wanderwise_customers', JSON.stringify(mappedData));
      }
    } catch (error) {
      console.warn('Failed to fetch customers, using local data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const addCustomer = async (customerData: Omit<Customer, 'id'>) => {
    const tempId = `local-${Date.now()}`;
    const optimisticCustomer = { 
      ...customerData, 
      id: tempId,
      agent_id: user?.id 
    };
    
    // Update local state and storage immediately
    setCustomers(prev => {
      const newState = [optimisticCustomer, ...prev];
      localStorage.setItem('wanderwise_customers', JSON.stringify(newState));
      return newState;
    });

    if (!user) return tempId;

    const newCustomer = {
      ...customerData,
      agent_id: user.id,
      preferences: customerData.preferences as unknown as Json,
    };

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert(newCustomer)
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        // Replace temp ID with real ID
        setCustomers(prev => {
          const newState = prev.map(c => c.id === tempId ? { ...c, id: data.id } : c);
          localStorage.setItem('wanderwise_customers', JSON.stringify(newState));
          return newState;
        });
        return data.id;
      }
    } catch (error) {
      console.warn('Failed to save customer to DB (using local only):', error);
      return tempId;
    }
    return tempId;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    // Optimistic update
    setCustomers(prev => {
      const newState = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      localStorage.setItem('wanderwise_customers', JSON.stringify(newState));
      return newState;
    });

    if (!user) return true;

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          ...updates,
          preferences: updates.preferences as unknown as Json
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.warn('Failed to update customer in DB (local only):', error);
      return true; // Return true as local update succeeded
    }
  };

  const deleteCustomer = async (id: string) => {
    setCustomers(prev => {
      const newState = prev.filter(c => c.id !== id);
      localStorage.setItem('wanderwise_customers', JSON.stringify(newState));
      return newState;
    });

    if (!user) return true;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.warn('Failed to delete customer from DB (local only):', error);
      return true;
    }
  };

  return {
    customers,
    loading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    refetch: fetchCustomers,
  };
};