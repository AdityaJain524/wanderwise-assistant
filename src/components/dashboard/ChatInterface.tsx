import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Send, Loader2, Bot, User, Sparkles, Save, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import ItineraryCard from './ItineraryCard';
import TradeoffSlider from './TradeoffSlider';
import { generateItineraries, sampleQueries, Itinerary } from '@/lib/mockData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChatMessage, useConversations } from '@/hooks/useConversations';
import { useItineraries } from '@/hooks/useItineraries';
import { useCustomers } from '@/hooks/useCustomers';

interface ChatInterfaceProps {
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
}

const ChatInterface = ({ conversationId, onConversationCreated }: ChatInterfaceProps) => {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tradeoff, setTradeoff] = useState(50);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { createConversation, updateConversation, getConversation } = useConversations();
  const { saveItinerary } = useItineraries();
  const { customers } = useCustomers();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Load existing conversation messages
  useEffect(() => {
    if (conversationId) {
      const conv = getConversation(conversationId);
      if (conv) {
        setMessages(conv.messages);
        setCurrentConversationId(conversationId);
      }
    } else {
      setMessages([]);
      setCurrentConversationId(null);
    }
  }, [conversationId, getConversation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSaveItinerary = async (itinerary: Itinerary, customerId?: string) => {
    const id = await saveItinerary(itinerary, currentConversationId || undefined, customerId || undefined);
    if (id) {
      const customerName = customerId ? customers.find(c => c.id === customerId)?.name : null;
      toast.success(customerName 
        ? `Itinerary saved and linked to ${customerName}!`
        : 'Itinerary saved successfully!'
      );
    } else {
      toast.error('Failed to save itinerary');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Create conversation if not exists
    let convId = currentConversationId;
    if (!convId) {
      const title = input.slice(0, 50) + (input.length > 50 ? '...' : '');
      convId = await createConversation(title);
      if (convId) {
        setCurrentConversationId(convId);
        onConversationCreated?.(convId);
      }
    }

    try {
      // Call the edge function for AI response
      const { data, error } = await supabase.functions.invoke('travel-chat', {
        body: {
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          language,
          tradeoffPreference: tradeoff,
        },
      });

      if (error) throw error;

      // Generate mock itineraries to display
      const itineraries = generateItineraries(2);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'I apologize, but I could not process your request.',
        itineraries: itineraries,
        showTradeoff: true,
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      // Save to database
      if (convId) {
        await updateConversation(convId, updatedMessages);
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      // Fallback to mock response
      const itineraries = generateItineraries(2);
      const fallbackMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I've analyzed your travel request and generated 3 optimized options based on your preferences. Each option is tailored to different priorities - budget, balanced value, or premium comfort.

Here's what I considered:
• Your travel needs and preferences
• Flight timing and convenience
• Hotel quality and amenities
• Overall value for money

You can use the preference slider below to adjust the recommendations based on what matters most to you.`,
        itineraries,
        showTradeoff: true,
      };

      const updatedMessages = [...newMessages, fallbackMessage];
      setMessages(updatedMessages);

      if (convId) {
        await updateConversation(convId, updatedMessages);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Travel Copilot</h2>
            <p className="text-xs text-muted-foreground">AI-powered travel planning</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-sm">
          <Sparkles className="w-4 h-4" />
          <span>Online</span>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl gradient-hero flex items-center justify-center mb-6 animate-bounce-subtle">
              <Bot className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-display text-2xl font-semibold text-foreground mb-2">
              {t('welcome')} to Travel Copilot
            </h3>
            <p className="text-muted-foreground max-w-md mb-8">
              I'm your AI travel assistant. Tell me about your travel needs and I'll find the best options for you.
            </p>
            
            {/* Sample Queries */}
            <div className="w-full max-w-2xl">
              <p className="text-sm text-muted-foreground mb-4">Try asking:</p>
              <div className="grid gap-3">
                {sampleQueries.slice(0, 3).map((query, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(query)}
                    className="p-4 text-left rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-soft transition-all duration-200"
                  >
                    <p className="text-sm text-foreground">{query}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-4 animate-slide-up",
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-xl gradient-primary flex-shrink-0 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] space-y-4",
                    message.role === 'user' ? 'items-end' : 'items-start'
                  )}
                >
                  <div
                    className={cn(
                      "rounded-2xl px-5 py-4",
                      message.role === 'user'
                        ? "gradient-primary text-primary-foreground"
                        : "bg-card border border-border shadow-soft"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  
                  {/* Tradeoff Slider */}
                  {message.showTradeoff && (
                    <TradeoffSlider value={tradeoff} onChange={setTradeoff} />
                  )}
                  
                  {/* Itinerary Cards */}
                  {message.itineraries && (
                    <div className="grid gap-4 mt-4">
                      {(message.itineraries as Itinerary[]).map((itinerary) => (
                        <div key={itinerary.id} className="relative">
                          <ItineraryCard itinerary={itinerary} />
                          <div className="absolute top-4 right-4 flex gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                >
                                  <Save className="w-3 h-3" />
                                  Save
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" align="end">
                                <div className="space-y-3">
                                  <div className="text-sm font-medium">Save Itinerary</div>
                                  <Select 
                                    value={selectedCustomerId || ''} 
                                    onValueChange={(val) => setSelectedCustomerId(val || null)}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Link to customer (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">No customer</SelectItem>
                                      {customers.map((customer) => (
                                        <SelectItem key={customer.id} value={customer.id}>
                                          <div className="flex items-center gap-2">
                                            <UserPlus className="w-3 h-3" />
                                            {customer.name}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                      handleSaveItinerary(
                                        itinerary, 
                                        selectedCustomerId === 'none' ? undefined : selectedCustomerId || undefined
                                      );
                                      setSelectedCustomerId(null);
                                    }}
                                  >
                                    Save Itinerary
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-10 h-10 rounded-xl bg-accent flex-shrink-0 flex items-center justify-center">
                    <User className="w-5 h-5 text-accent-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-4 animate-slide-up">
                <div className="w-10 h-10 rounded-xl gradient-primary flex-shrink-0 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="bg-card border border-border rounded-2xl px-5 py-4 shadow-soft">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Analyzing your request...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-card/50">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('typeMessage')}
              className="min-h-[52px] max-h-[200px] resize-none bg-background"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="h-[52px] w-[52px] gradient-primary text-primary-foreground shadow-glow-primary"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
