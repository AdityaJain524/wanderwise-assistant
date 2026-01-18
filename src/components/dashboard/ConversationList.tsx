import { useConversations } from '@/hooks/useConversations';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MessageSquare, Trash2, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
  onSelectConversation: (id: string) => void;
  selectedId: string | null;
}

const ConversationList = ({ onSelectConversation, selectedId }: ConversationListProps) => {
  const { t } = useLanguage();
  const { conversations, loading, deleteConversation } = useConversations();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">No conversations yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Start a new chat to begin planning travel itineraries for your customers.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="p-6 border-b border-border">
        <h2 className="font-display text-xl font-semibold text-foreground">
          {t('conversations')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {conversations.map((conv) => (
            <Card
              key={conv.id}
              className={cn(
                "p-4 cursor-pointer transition-all duration-200 hover:shadow-soft border",
                selectedId === conv.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">
                      {conv.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                      </span>
                      <span className="mx-1">•</span>
                      <span>{conv.messages.length} messages</span>
                    </div>
                    {conv.messages.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {conv.messages[conv.messages.length - 1]?.content.slice(0, 100)}...
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ConversationList;
