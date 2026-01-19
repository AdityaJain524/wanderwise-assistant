import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBookingChecklists, ChecklistItem } from '@/hooks/useBookingChecklists';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Trash2,
  Loader2,
  ClipboardCheck,
  FileText,
  CreditCard,
  CheckCircle2,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const BookingChecklist = () => {
  const { t } = useLanguage();
  const { checklists, loading, createChecklist, updateChecklistItem, deleteChecklist } = useBookingChecklists();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    await createChecklist(newTitle.trim());
    setNewTitle('');
    setIsDialogOpen(false);
  };

  const getCategoryIcon = (category: ChecklistItem['category']) => {
    switch (category) {
      case 'documents':
        return <FileText className="w-4 h-4" />;
      case 'payments':
        return <CreditCard className="w-4 h-4" />;
      case 'confirmations':
        return <CheckCircle2 className="w-4 h-4" />;
      default:
        return <MoreHorizontal className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success/10 text-success border-success/20">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-warning/10 text-warning border-warning/20">In Progress</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getProgress = (items: ChecklistItem[]) => {
    const completed = items.filter(i => i.completed).length;
    return Math.round((completed / items.length) * 100);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            {t('bookingChecklist')}
          </h2>
          <p className="text-muted-foreground">Track documents, payments & confirmations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              New Checklist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Booking Checklist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Checklist title (e.g., Mumbai to Delhi Trip)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button onClick={handleCreate} disabled={!newTitle.trim()}>
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="flex-1">
        {checklists.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <ClipboardCheck className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No checklists yet</h3>
            <p className="text-muted-foreground mb-4">Create a checklist to track your bookings</p>
            <Button onClick={() => setIsDialogOpen(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create First Checklist
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {checklists.map((checklist) => {
              const isExpanded = expandedId === checklist.id;
              const progress = getProgress(checklist.items);

              return (
                <Card
                  key={checklist.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-card",
                    isExpanded && "md:col-span-2 lg:col-span-3"
                  )}
                  onClick={() => setExpandedId(isExpanded ? null : checklist.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{checklist.title}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(checklist.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(checklist.status)}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChecklist(checklist.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-4">
                        {['documents', 'confirmations', 'payments', 'other'].map((category) => {
                          const categoryItems = checklist.items.filter(
                            (item) => item.category === category
                          );
                          if (categoryItems.length === 0) return null;

                          return (
                            <div key={category} className="space-y-2">
                              <h4 className="text-sm font-medium text-foreground capitalize flex items-center gap-2">
                                {getCategoryIcon(category as ChecklistItem['category'])}
                                {category}
                              </h4>
                              <div className="space-y-2 pl-6">
                                {categoryItems.map((item) => (
                                  <div key={item.id} className="flex items-center gap-3">
                                    <Checkbox
                                      checked={item.completed}
                                      onCheckedChange={(checked) =>
                                        updateChecklistItem(
                                          checklist.id,
                                          item.id,
                                          checked as boolean
                                        )
                                      }
                                    />
                                    <span
                                      className={cn(
                                        "text-sm",
                                        item.completed && "line-through text-muted-foreground"
                                      )}
                                    >
                                      {item.label}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default BookingChecklist;