import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  category: 'documents' | 'payments' | 'confirmations' | 'other';
}

export interface BookingChecklist {
  id: string;
  title: string;
  itinerary_id: string | null;
  customer_id: string | null;
  items: ChecklistItem[];
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  updated_at: string;
}

const defaultChecklistItems: ChecklistItem[] = [
  { id: '1', label: 'Passport/ID verified', completed: false, category: 'documents' },
  { id: '2', label: 'Visa requirements checked', completed: false, category: 'documents' },
  { id: '3', label: 'Travel insurance obtained', completed: false, category: 'documents' },
  { id: '4', label: 'Flight tickets booked', completed: false, category: 'confirmations' },
  { id: '4t', label: 'Train tickets booked', completed: false, category: 'confirmations' },
  { id: '5', label: 'Hotel reservation confirmed', completed: false, category: 'confirmations' },
  { id: '6', label: 'Restaurant reservations made', completed: false, category: 'confirmations' },
  { id: '7', label: 'Airport/Station transfer arranged', completed: false, category: 'confirmations' },
  { id: '7t', label: 'PNR status verified', completed: false, category: 'confirmations' },
  { id: '8', label: 'Initial payment received', completed: false, category: 'payments' },
  { id: '9', label: 'Full payment received', completed: false, category: 'payments' },
  { id: '10', label: 'Payment confirmation sent', completed: false, category: 'payments' },
  { id: '11', label: 'Itinerary sent to customer', completed: false, category: 'other' },
  { id: '12', label: 'Emergency contacts shared', completed: false, category: 'other' },
  { id: '13t', label: 'Coach & Berth preferences confirmed', completed: false, category: 'other' },
];

export const useBookingChecklists = () => {
  const { user } = useAuth();
  const [checklists, setChecklists] = useState<BookingChecklist[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChecklists = useCallback(async () => {
    // Load from local storage first
    const localData = localStorage.getItem('wanderwise_checklists');
    if (localData) {
      try {
        setChecklists(JSON.parse(localData));
        setLoading(false);
      } catch (e) {
        console.error('Error parsing local checklists:', e);
      }
    }

    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('booking_checklists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const parsedChecklists = (data || []).map(checklist => ({
        ...checklist,
        items: Array.isArray(checklist.items) ? checklist.items : JSON.parse(checklist.items as string || '[]'),
        status: checklist.status as 'pending' | 'in_progress' | 'completed',
      }));

      setChecklists(parsedChecklists);
      localStorage.setItem('wanderwise_checklists', JSON.stringify(parsedChecklists));
    } catch (error) {
      console.warn('Failed to fetch checklists from DB (using empty/local):', error);
      // In a real app, load from localStorage
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchChecklists();
  }, [fetchChecklists]);

  const createChecklist = async (
    title: string, 
    itineraryId?: string, 
    customerId?: string, 
    isInternational: boolean = true,
    transportMode: 'plane' | 'train' | 'bus' = 'plane'
  ): Promise<string | null> => {
    const mockId = `local-list-${Date.now()}`;
    
    // Filter items based on domestic vs international and transport mode
    let initialItems = JSON.parse(JSON.stringify(defaultChecklistItems));
    
    if (!isInternational) {
      initialItems = initialItems
        .filter((item: ChecklistItem) => item.label !== 'Visa requirements checked')
        .map((item: ChecklistItem) => 
          item.label === 'Passport/ID verified' 
            ? { ...item, label: 'Government ID verified' } 
            : item
        );
    }

    // Filter based on transport mode
    if (transportMode === 'train') {
      initialItems = initialItems.filter((item: ChecklistItem) => !item.id.includes('4') || item.id === '4t');
      initialItems = initialItems.map((item: ChecklistItem) => 
        item.label === 'Airport/Station transfer arranged' ? { ...item, label: 'Station transfer arranged' } : item
      );
    } else if (transportMode === 'plane') {
      initialItems = initialItems.filter((item: ChecklistItem) => !item.id.endsWith('t'));
      initialItems = initialItems.map((item: ChecklistItem) => 
        item.label === 'Airport/Station transfer arranged' ? { ...item, label: 'Airport transfer arranged' } : item
      );
    } else {
      // bus or other
      initialItems = initialItems.filter((item: ChecklistItem) => !item.id.endsWith('t') && item.id !== '4');
      if (transportMode === 'bus') {
        initialItems.push({ id: '4b', label: 'Bus tickets booked', completed: false, category: 'confirmations' });
      }
    }

    const newChecklist: BookingChecklist = {
      id: mockId,
      title,
      itinerary_id: itineraryId || null,
      customer_id: customerId || null,
      items: initialItems,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistic update
    setChecklists(prev => {
      const newState = [newChecklist, ...prev];
      localStorage.setItem('wanderwise_checklists', JSON.stringify(newState));
      return newState;
    });

    if (!user) {
      toast.success('Checklist created (local mode)');
      return mockId;
    }

    try {
      const { data, error } = await supabase
        .from('booking_checklists')
        .insert({
          agent_id: user.id,
          title,
          itinerary_id: itineraryId || null,
          customer_id: customerId || null,
          items: initialItems,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Replace temp ID with real ID
        setChecklists(prev => {
          const newState = prev.map(c => c.id === mockId ? { ...c, id: data.id } : c);
          localStorage.setItem('wanderwise_checklists', JSON.stringify(newState));
          return newState;
        });
        return data.id;
      }
    } catch (error) {
      console.warn('Failed to create checklist in DB (local only):', error);
      toast.success('Checklist created (local mode)');
      return mockId;
    }
    return mockId;
  };

  const updateChecklistItem = async (checklistId: string, itemId: string, completed: boolean) => {
    const checklist = checklists.find(c => c.id === checklistId);
    if (!checklist) return;

    const updatedItems = checklist.items.map(item =>
      item.id === itemId ? { ...item, completed } : item
    );

    const completedCount = updatedItems.filter(i => i.completed).length;
    const newStatus = completedCount === 0 ? 'pending' : 
                      completedCount === updatedItems.length ? 'completed' : 'in_progress';

    // Optimistic update
    setChecklists(prev => {
      const newState = prev.map(c =>
        c.id === checklistId ? { ...c, items: updatedItems, status: newStatus } : c
      );
      localStorage.setItem('wanderwise_checklists', JSON.stringify(newState));
      return newState;
    });

    if (!user) return;

    try {
      const { error } = await supabase
        .from('booking_checklists')
        .update({ 
          items: JSON.parse(JSON.stringify(updatedItems)),
          status: newStatus,
        })
        .eq('id', checklistId);

      if (error) throw error;
    } catch (error) {
      console.warn('Failed to update checklist in DB (local only):', error);
    }
  };

  const deleteChecklist = async (id: string) => {
    // Optimistic delete
    setChecklists(prev => {
      const newState = prev.filter(c => c.id !== id);
      localStorage.setItem('wanderwise_checklists', JSON.stringify(newState));
      return newState;
    });
    toast.success('Checklist deleted');

    if (!user) return;

    try {
      const { error } = await supabase
        .from('booking_checklists')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.warn('Failed to delete checklist from DB (local only):', error);
    }
  };

  return {
    checklists,
    loading,
    createChecklist,
    updateChecklistItem,
    deleteChecklist,
    refetch: fetchChecklists,
  };
};