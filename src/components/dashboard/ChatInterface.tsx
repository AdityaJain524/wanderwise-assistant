import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTravelMode } from '@/contexts/TravelModeContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Send, Loader2, Bot, User, Sparkles, Save, UserPlus, Plus, X,
  Bus, Train, Plane, WifiOff, Star, MessageSquare, ExternalLink,
  Check, ChevronsUpDown, Users, Search as SearchIcon, ClipboardCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import ItineraryCard from './ItineraryCard';
import TradeoffSlider from './TradeoffSlider';
import { generateItineraries, sampleQueries, Itinerary } from '@/lib/mockData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChatMessage, useConversations } from '@/hooks/useConversations';
import { useItineraries } from '@/hooks/useItineraries';
import { useCustomers } from '@/hooks/useCustomers';
import { cacheItem, getCachedItem } from '@/hooks/useOfflineCache';
import { generateTravelResponse } from '@/lib/gemini';
import { useBookingChecklists } from '@/hooks/useBookingChecklists';

interface ChatInterfaceProps {
  conversationId: string | null;
  onConversationCreated?: (id: string) => void;
}

const travelModeLabels = {
  bus: { name: 'Bus', icon: Bus, color: 'text-green-500' },
  train: { name: 'Train', icon: Train, color: 'text-blue-500' },
  plane: { name: 'Plane', icon: Plane, color: 'text-purple-500' },
};

const ChatInterface = ({ conversationId, onConversationCreated }: ChatInterfaceProps) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { travelMode, setTravelMode } = useTravelMode();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tradeoff, setTradeoff] = useState(50);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { createConversation, updateConversation, getConversation, setConversationCustomer } = useConversations();
  const { saveItinerary } = useItineraries();
  const { customers } = useCustomers();
  const { createChecklist } = useBookingChecklists();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId);
  const lastConversationId = useRef<string | null>(undefined);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeCustomerIds, setActiveCustomerIds] = useState<string[]>([]);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessageId, setFeedbackMessageId] = useState<string | null>(null);

  // Helper to format message content
  const formatMessageContent = (content: string) => {
    // 1. Handle Mode Filtering (Real-time switching)
    let filteredContent = content;
    const modeTags = ['PLANE', 'TRAIN', 'BUS'];
    const currentTag = travelMode?.toUpperCase() || 'PLANE';
    
    // Check if the content has mode tags
    const hasTags = modeTags.some(tag => content.includes(`<${tag}>`));
    
    if (hasTags) {
      const regex = new RegExp(`<${currentTag}>([\\s\\S]*?)</${currentTag}>`, 'i');
      const match = content.match(regex);
      if (match) {
        filteredContent = match[1].trim();
      } else {
        // Fallback if current mode isn't in response
        const anyMatch = content.match(/<[A-Z]+>([\s\S]*?)<\/[A-Z]+>/i);
        filteredContent = anyMatch ? anyMatch[1].trim() : content;
      }
    }

    const lines = filteredContent.split('\n');
    return lines.map((line, i) => {
      // Handle Headers
      if (line.trim().startsWith('###')) {
        return <h3 key={i} className="text-lg font-bold mt-4 mb-2 text-primary">{parseInlineFormatting(line.replace(/^###\s*/, ''))}</h3>;
      }
      
      // Handle Bullet Points
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
         return (
           <div key={i} className="flex gap-2 ml-1 mb-1">
             <span className="text-primary">•</span>
             <span>{parseInlineFormatting(line.replace(/^[\*\-]\s*/, ''))}</span>
           </div>
         );
      }

      // Handle HR
      if (line.trim() === '---') {
        return <hr key={i} className="my-4 border-border" />;
      }

      // Default paragraph with inline formatting
      return <p key={i} className="mb-1 min-h-[1rem]">{parseInlineFormatting(line)}</p>;
    });
  };

  const parseInlineFormatting = (text: string) => {
    // Basic parser for **bold**, *bold*, and [link](url)
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g);
    
    return parts.map((part, index) => {
      // Handle Bold (**text** or *text*)
      if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('*') && part.endsWith('*'))) {
        const content = part.startsWith('**') ? part.slice(2, -2) : part.slice(1, -1);
        return <strong key={index} className="font-bold text-primary">{content}</strong>;
      }
      
      if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
        const [label, url] = part.slice(1, -1).split('](');
        return (
          <a 
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
          >
            {label}
            <ExternalLink className="w-3 h-3" />
          </a>
        );
      }
      return part;
    });
  };

  const handleFeedbackSubmit = async (messageId: string) => {
    if (!feedbackRating || !user) return;

    try {
      const { error } = await supabase.from('feedback').insert({
        agent_id: user.id,
        conversation_id: currentConversationId,
        message_id: messageId,
        rating: feedbackRating,
        feedback_text: feedbackText || null,
      });

      if (error) throw error;

      toast.success(`Thank you for your feedback! Rating: ${feedbackRating}/5`);
      setFeedbackRating(null);
      setFeedbackText('');
    } catch (error) {
      console.error('Error saving feedback:', error);
      toast.error('Failed to save feedback. Please try again.');
    }
  };

  const handleCreateChecklistFromTrip = async (message: ChatMessage) => {
    if (!message.itineraries || message.itineraries.length === 0) return;
    
    const itinerary = message.itineraries[0] as Itinerary;
    const title = `Checklist: ${itinerary.flight.departure.city} to ${itinerary.flight.arrival.city}`;
    
    // Simple heuristic for international
    const domesticCities = ['mumbai', 'delhi', 'bangalore', 'chennai', 'kolkata', 'hyderabad', 'pune', 'goa', 'ahmedabad', 'jaipur'];
    const toCity = itinerary.flight.arrival.city.toLowerCase();
    const isInternational = !domesticCities.some(city => toCity.includes(city));
    
    const checklistId = await createChecklist(
      title,
      itinerary.id,
      activeCustomerIds[0] || undefined,
      isInternational,
      travelMode || 'plane'
    );
    
    if (checklistId) {
      toast.success('Booking checklist generated successfully!');
    }
  };

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const modeInfo = travelMode ? travelModeLabels[travelMode] : null;
  const ModeIcon = modeInfo?.icon || Plane;

  // Load existing conversation messages
  useEffect(() => {
    // Only run if the conversationId actually changed from the prop
    if (conversationId === lastConversationId.current) return;
    lastConversationId.current = conversationId;

    if (conversationId) {
      const conv = getConversation(conversationId);
      if (conv) {
        setMessages(conv.messages);
        setCurrentConversationId(conversationId);
        if (conv.customer_id) {
          setActiveCustomerIds(conv.customer_id.split(','));
        } else {
          setActiveCustomerIds([]);
        }
      }
    } else {
      setMessages([]);
      setCurrentConversationId(null);
      setActiveCustomerIds([]);
    }
  }, [conversationId, getConversation]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleCustomer = async (cid: string) => {
    const isSelected = activeCustomerIds.includes(cid);
    const newIds = isSelected 
      ? activeCustomerIds.filter(id => id !== cid)
      : [...activeCustomerIds, cid];
    
    setActiveCustomerIds(newIds);
    
    if (currentConversationId) {
      // Sync only the first selected customer to the database field (for foreign key compatibility)
      await setConversationCustomer(currentConversationId, newIds.length > 0 ? newIds[0] : null);
    }
    
    toast.success(isSelected ? "Traveler removed" : "Traveler added");
  };

  const getCustomerContext = () => {
    if (activeCustomerIds.length === 0) return '';
    
    const contextLines = activeCustomerIds.map(id => {
      const customer = customers.find(c => c.id === id);
      if (!customer) return '';
      
      let context = `Name: ${customer.name}. `;
      if (customer.notes) context += `Notes: ${customer.notes}. `;
      if (customer.preferences) {
        const p = customer.preferences;
        context += `Preferences: Budget Sensitivity ${p.budgetSensitivity}%, Comfort Priority ${p.comfortPriority}%. `;
        if (p.preferredAirlines?.length) context += `Preferred Airlines: ${p.preferredAirlines.join(', ')}. `;
        if (p.hotelType !== 'any') context += `Preferred Hotel: ${p.hotelType}. `;
        if (p.seatPreference !== 'any') context += `Seat: ${p.seatPreference}. `;
        if (p.specialNeeds?.length) context += `Special Needs: ${p.specialNeeds.join(', ')}. `;
      }
      return context;
    }).filter(Boolean);

    if (contextLines.length > 1) {
      return `FAMILY/GROUP TRIP (${contextLines.length} people): \n` + contextLines.join('\n');
    }
    return contextLines[0];
  };

  const handleSaveItinerary = async (itinerary: Itinerary, customerId?: string) => {
    const targetCustomerId = customerId || activeCustomerIds[0] || undefined;
    const id = await saveItinerary(itinerary, currentConversationId || undefined, targetCustomerId);
    if (id) {
      const customerName = targetCustomerId ? customers.find(c => c.id === targetCustomerId)?.name : null;
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
      const primaryCid = activeCustomerIds.length > 0 ? activeCustomerIds[0] : null;
      convId = await createConversation(title, primaryCid);
      if (convId) {
        setCurrentConversationId(convId);
        onConversationCreated?.(convId);
      }
    }

    // Check if offline
    if (isOffline) {
      toast.error('You are offline. AI responses are not available.');
      setIsLoading(false);
      return;
    }

    try {
      // Use Client-side Gemini API directly
      const { text, error, itineraries } = await generateTravelResponse(
        newMessages.map(m => ({ role: m.role, content: m.content })),
        language,
        travelMode || 'plane',
        tradeoff,
        getCustomerContext()
      );

      if (error && error !== "API_FAILED") {
        if (error.includes('VITE_GEMINI_API_KEY')) {
          toast.error('Missing Gemini API Key. Please add VITE_GEMINI_API_KEY to your .env file.');
        }
        throw new Error(error);
      }
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: text || 'I apologize, but I could not generate a response.',
        itineraries: (error === "API_FAILED") ? [] : (itineraries || []), 
        showTradeoff: error !== "API_FAILED",
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      // Save to database
      if (convId) {
        const primaryCid = activeCustomerIds.length > 0 ? activeCustomerIds[0] : null;
        await updateConversation(convId, updatedMessages, undefined, primaryCid);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      
      // Fallback only if it's NOT a missing key error
      if (!error.message.includes('VITE_GEMINI_API_KEY')) {
         // Even in error, generateTravelResponse should have been called, 
         // but if it failed completely, we call it again just for the local data
         const { itineraries: localItineraries } = await generateTravelResponse(
           newMessages.map(m => ({ role: m.role, content: m.content })),
           language,
           travelMode || 'plane',
           tradeoff,
           getCustomerContext()
         );
         
         const fallbackMessage: ChatMessage = {
           id: (Date.now() + 1).toString(),
           role: 'assistant',
           content: `[System Error] I couldn't connect to the AI service. 
Error details: ${error.message}

However, here are some standard options based on your request:`,
           itineraries: localItineraries || [],
           showTradeoff: true,
         };
         const updatedMessages = [...newMessages, fallbackMessage];
         setMessages(updatedMessages);
         if (convId) {
            const primaryCid = activeCustomerIds.length > 0 ? activeCustomerIds[0] : null;
            await updateConversation(convId, updatedMessages, undefined, primaryCid);
         }
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
      <div className="min-h-16 h-auto py-3 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex flex-wrap items-center gap-4 lg:gap-8 py-1">
          {/* Brand/Bot Info */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-soft">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h2 className="font-semibold text-foreground leading-tight">Travel Copilot</h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">AI Agent</p>
            </div>
          </div>

          <div className="h-8 w-px bg-border hidden md:block flex-shrink-0" />

          {/* Transport Selector */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex bg-muted p-1 rounded-lg border border-border">
              {(['plane', 'train', 'bus'] as TravelMode[]).map((mode) => {
                const Icon = travelModeLabels[mode].icon;
                const isActive = travelMode === mode;
                return (
                  <Button
                    key={mode}
                    variant="ghost"
                    size="sm"
                    onClick={() => setTravelMode(mode)}
                    className={cn(
                      "h-8 px-3 gap-2 rounded-md transition-all duration-200",
                      isActive 
                        ? "bg-background text-primary shadow-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium capitalize hidden lg:inline">{mode}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="h-8 w-px bg-border hidden md:block flex-shrink-0" />

          {/* traveler Selector (Badges) */}
          <div className="flex flex-wrap items-center gap-2 max-w-[300px] lg:max-w-[500px]">
            {activeCustomerIds.length === 0 && (
              <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                <Users className="w-3 h-3" /> No travelers selected
              </span>
            )}
            
            {activeCustomerIds.map(id => {
              const c = customers.find(cust => cust.id === id);
              if (!c) return null;
              return (
                <Badge key={id} variant="secondary" className="pl-2 pr-1 py-1 gap-1 animate-in fade-in zoom-in duration-200">
                  <span className="text-[11px] font-medium">{c.name}</span>
                  <button 
                    onClick={() => toggleCustomer(id)}
                    className="p-0.5 rounded-full hover:bg-muted-foreground/20 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              );
            })}

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-dashed gap-1 px-2">
                  <Plus className="w-3 h-3" />
                  <span className="text-xs">{activeCustomerIds.length === 0 ? "Add Traveler" : "Add More"}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <div className="p-2 border-b border-border bg-muted/30">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Select Travelers</h4>
                </div>
                <ScrollArea className="h-[250px]">
                  <div className="p-1 space-y-0.5">
                    {customers.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">No customers found.</p>
                      </div>
                    ) : (
                      customers.map((c) => {
                        const isSelected = activeCustomerIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            onClick={() => toggleCustomer(c.id)}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all",
                              isSelected 
                                ? "bg-primary/10 text-primary font-medium" 
                                : "hover:bg-muted text-foreground"
                            )}
                          >
                            <div className="flex flex-col items-start overflow-hidden">
                              <span className="truncate w-full">{c.name}</span>
                              {c.email && <span className="text-[10px] opacity-70 truncate w-full">{c.email}</span>}
                            </div>
                            {isSelected && <Check className="w-4 h-4 flex-shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3 ml-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border">
            {isOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-destructive" />
                <span className="text-[11px] font-medium text-destructive">Offline</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-success animate-pulse-subtle" />
                <span className="text-[11px] font-medium text-success">AI Ready</span>
              </>
            )}
          </div>
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
                    <div className="text-sm">
                      {message.role === 'assistant' 
                        ? formatMessageContent(message.content)
                        : <p className="whitespace-pre-wrap">{message.content}</p>
                      }
                    </div>
                  </div>
                  
                  {/* Action Buttons for assistant messages */}
                  {message.role === 'assistant' && message.itineraries && message.itineraries.length > 0 && (
                    <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 gap-2 bg-background/50 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-sm"
                        onClick={() => handleCreateChecklistFromTrip(message)}
                      >
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        Generate Booking Checklist
                      </Button>
                    </div>
                  )}

                  {/* Feedback UI for assistant messages */}
                  {message.role === 'assistant' && message.content.includes('rate this response') && (
                    <div className="mt-3 p-4 bg-muted/50 rounded-xl border border-border">
                      <div className="flex items-center gap-2 mb-3">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Rate this response</span>
                      </div>
                      <div className="flex gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setFeedbackRating(star)}
                            className={cn(
                              "p-1 rounded transition-colors",
                              feedbackRating && feedbackRating >= star
                                ? "text-warning"
                                : "text-muted-foreground hover:text-warning/70"
                            )}
                          >
                            <Star className={cn("w-6 h-6", feedbackRating && feedbackRating >= star && "fill-current")} />
                          </button>
                        ))}
                      </div>
                      <Input
                        placeholder="Any changes or feedback? (optional)"
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        className="mb-2"
                      />
                      <Button 
                        size="sm" 
                        onClick={() => handleFeedbackSubmit(message.id)}
                        disabled={!feedbackRating}
                        className="w-full"
                      >
                        Submit Feedback
                      </Button>
                    </div>
                  )}
                  
                  {/* Itinerary Cards */}
                  {message.itineraries && (
                    <div className="grid gap-4 mt-4">
                      {(message.itineraries as Itinerary[])
                        .filter(itin => !itin.transportMode || itin.transportMode === (travelMode || 'plane'))
                        .map((itinerary) => (
                        <div key={itinerary.id} className="relative group">
                          <ItineraryCard itinerary={itinerary} />
                          <div className="absolute top-3 -right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  size="sm"
                                  className="gap-1 shadow-md bg-background hover:bg-muted text-foreground border border-border"
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