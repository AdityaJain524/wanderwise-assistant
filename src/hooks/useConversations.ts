import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Json } from '@/integrations/supabase/types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  itineraries?: unknown[];
  showTradeoff?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    // Load from local storage first
    const localData = localStorage.getItem('wanderwise_conversations');
    if (localData) {
      try {
        setConversations(JSON.parse(localData));
        setLoading(false);
      } catch (e) {
        console.error('Error parsing local conversations:', e);
      }
    }

    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('agent_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedData = data.map(conv => ({
          ...conv,
          messages: Array.isArray(conv.messages) ? (conv.messages as unknown as ChatMessage[]) : [],
        }));
        setConversations(mappedData);
        localStorage.setItem('wanderwise_conversations', JSON.stringify(mappedData));
      }
    } catch (error) {
      console.warn('Failed to fetch conversations from Supabase, falling back to local state/empty:', error);
      // Keep local data if fetch fails
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const createConversation = async (title: string = 'New Conversation', customerId: string | null = null): Promise<string | null> => {
    const mockId = `local-${Date.now()}`;
    const mockConv: Conversation = {
      id: mockId,
      title,
      messages: [],
      customer_id: customerId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistic update
    setConversations(prev => {
      const newState = [mockConv, ...prev];
      localStorage.setItem('wanderwise_conversations', JSON.stringify(newState));
      return newState;
    });

    if (!user) return mockId;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          agent_id: user.id,
          title,
          messages: [] as unknown as Json,
          customer_id: customerId,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setConversations(prev => {
          const newState = prev.map(c => c.id === mockId ? { ...data, messages: [] } : c as Conversation);
          localStorage.setItem('wanderwise_conversations', JSON.stringify(newState));
          return newState;
        });
        return data.id;
      }
    } catch (error) {
      console.warn('Failed to create conversation in Supabase, using local fallback:', error);
      return mockId;
    }
    return null;
  };

  const updateConversation = async (id: string, messages: ChatMessage[], title?: string, customerId?: string | null) => {
    const updates: { messages: Json; title?: string; updated_at: string; customer_id?: string | null } = {
      messages: messages as unknown as Json,
      updated_at: new Date().toISOString(),
    };

    if (title) {
      updates.title = title;
    }

    if (customerId !== undefined) {
      updates.customer_id = customerId;
    }

    // Optimistically update local state
    setConversations(prev => {
      const newState = prev.map(conv => 
        conv.id === id 
          ? { ...conv, messages, title: title || conv.title, updated_at: updates.updated_at, customer_id: customerId !== undefined ? customerId : conv.customer_id }
          : conv
      );
      localStorage.setItem('wanderwise_conversations', JSON.stringify(newState));
      return newState;
    });

    if (!user) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .update(updates)
        .eq('id', id)
        .eq('agent_id', user.id);
        
      if (error) throw error;
    } catch (error) {
      console.warn('Failed to update conversation in Supabase (local state only):', error);
    }
  };

  const setConversationCustomer = async (conversationId: string, customerId: string | null) => {
    // Optimistic update
    setConversations(prev => {
      const newState = prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, customer_id: customerId, updated_at: new Date().toISOString() }
          : conv
      );
      localStorage.setItem('wanderwise_conversations', JSON.stringify(newState));
      return newState;
    });

    if (!user) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ customer_id: customerId, updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('agent_id', user.id);
        
      if (error) throw error;
    } catch (error) {
      console.warn('Failed to link customer to conversation:', error);
    }
  };

  const deleteConversation = async (id: string) => {
    setConversations(prev => {
      const newState = prev.filter(conv => conv.id !== id);
      localStorage.setItem('wanderwise_conversations', JSON.stringify(newState));
      return newState;
    });

    if (!user) return;

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('agent_id', user.id);

    if (error) console.warn('Error deleting conversation from Supabase:', error);
  };

  const getConversation = useCallback((id: string) => {
    return conversations.find(conv => conv.id === id);
  }, [conversations]);

  return {
    conversations,
    loading,
    createConversation,
    updateConversation,
    setConversationCustomer,
    deleteConversation,
    getConversation,
    refetch: fetchConversations,
  };
};
