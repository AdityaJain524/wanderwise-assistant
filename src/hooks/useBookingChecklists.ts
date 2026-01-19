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
  { id: '5', label: 'Hotel reservation confirmed', completed: false, category: 'confirmations' },
  { id: '6', label: 'Restaurant reservations made', completed: false, category: 'confirmations' },
  { id: '7', label: 'Airport transfer arranged', completed: false, category: 'confirmations' },
  { id: '8', label: 'Initial payment received', completed: false, category: 'payments' },
  { id: '9', label: 'Full payment received', completed: false, category: 'payments' },
  { id: '10', label: 'Payment confirmation sent', completed: false, category: 'payments' },
  { id: '11', label: 'Itinerary sent to customer', completed: false, category: 'other' },
  { id: '12', label: 'Emergency contacts shared', completed: false, category: 'other' },
];

export const useBookingChecklists = () => {
  const { user } = useAuth();
  const [checklists, setChecklists] = useState<BookingChecklist[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChecklists = useCallback(async () => {
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
    } catch (error) {
      console.error('Error fetching checklists:', error);
      toast.error('Failed to load checklists');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchChecklists();
  }, [fetchChecklists]);

  const createChecklist = async (title: string, itineraryId?: string, customerId?: string): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('booking_checklists')
        .insert({
          agent_id: user.id,
          title,
          itinerary_id: itineraryId || null,
          customer_id: customerId || null,
          items: JSON.parse(JSON.stringify(defaultChecklistItems)),
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      const newChecklist: BookingChecklist = {
        ...data,
        items: defaultChecklistItems,
        status: data.status as 'pending' | 'in_progress' | 'completed',
      };

      setChecklists(prev => [newChecklist, ...prev]);
      toast.success('Checklist created!');
      return data.id;
    } catch (error) {
      console.error('Error creating checklist:', error);
      toast.error('Failed to create checklist');
      return null;
    }
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

    try {
      const { error } = await supabase
        .from('booking_checklists')
        .update({ 
          items: JSON.parse(JSON.stringify(updatedItems)),
          status: newStatus,
        })
        .eq('id', checklistId);

      if (error) throw error;

      setChecklists(prev =>
        prev.map(c =>
          c.id === checklistId ? { ...c, items: updatedItems, status: newStatus } : c
        )
      );
    } catch (error) {
      console.error('Error updating checklist:', error);
      toast.error('Failed to update checklist');
    }
  };

  const deleteChecklist = async (id: string) => {
    try {
      const { error } = await supabase
        .from('booking_checklists')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setChecklists(prev => prev.filter(c => c.id !== id));
      toast.success('Checklist deleted');
    } catch (error) {
      console.error('Error deleting checklist:', error);
      toast.error('Failed to delete checklist');
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