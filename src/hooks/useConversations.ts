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
    if (!user) return;

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('agent_id', user.id)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setConversations(data.map(conv => ({
        ...conv,
        messages: Array.isArray(conv.messages) ? (conv.messages as unknown as ChatMessage[]) : [],
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const createConversation = async (title: string = 'New Conversation'): Promise<string | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        agent_id: user.id,
        title,
        messages: [] as unknown as Json,
      })
      .select()
      .single();

    if (!error && data) {
      setConversations(prev => [{
        ...data,
        messages: [],
      }, ...prev]);
      return data.id;
    }
    return null;
  };

  const updateConversation = async (id: string, messages: ChatMessage[], title?: string) => {
    if (!user) return;

    const updates: { messages: Json; title?: string; updated_at: string } = {
      messages: messages as unknown as Json,
      updated_at: new Date().toISOString(),
    };

    if (title) {
      updates.title = title;
    }

    const { error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .eq('agent_id', user.id);

    if (!error) {
      setConversations(prev => prev.map(conv => 
        conv.id === id 
          ? { ...conv, messages, title: title || conv.title, updated_at: updates.updated_at }
          : conv
      ));
    }
  };

  const deleteConversation = async (id: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('agent_id', user.id);

    if (!error) {
      setConversations(prev => prev.filter(conv => conv.id !== id));
    }
  };

  const getConversation = (id: string) => {
    return conversations.find(conv => conv.id === id);
  };

  return {
    conversations,
    loading,
    createConversation,
    updateConversation,
    deleteConversation,
    getConversation,
    refetch: fetchConversations,
  };
};
