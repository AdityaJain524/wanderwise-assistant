import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export const useCustomers = () => {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .eq('agent_id', user.id)
      .order('name', { ascending: true });

    if (!error && data) {
      setCustomers(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return {
    customers,
    loading,
    refetch: fetchCustomers,
  };
};