import { useState } from 'react';
import { useItineraries } from '@/hooks/useItineraries';
import { useCustomers } from '@/hooks/useCustomers';
import { useLanguage } from '@/contexts/LanguageContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Map, Trash2, Plane, Hotel, IndianRupee, Clock, Loader2, User, UserPlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const ItineraryList = () => {
  const { t } = useLanguage();
  const { itineraries, loading, deleteItinerary, updateItineraryStatus, updateItineraryCustomer } = useItineraries();
  const { customers, loading: customersLoading } = useCustomers();
  const [linkDialogOpen, setLinkDialogOpen] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');

  const typeConfig = {
    budget: {
      label: t('budget'),
      badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    },
    balanced: {
      label: t('balanced'),
      badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    },
    comfort: {
      label: t('comfort'),
      badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    },
  };

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    saved: { label: 'Saved', variant: 'outline' },
    sent: { label: 'Sent', variant: 'secondary' },
    booked: { label: 'Booked', variant: 'default' },
  };

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return null;
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  };

  const handleLinkCustomer = async (itineraryId: string) => {
    if (!selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }
    await updateItineraryCustomer(itineraryId, selectedCustomer);
    toast.success('Customer linked successfully!');
    setLinkDialogOpen(null);
    setSelectedCustomer('');
  };

  const handleUnlinkCustomer = async (itineraryId: string) => {
    await updateItineraryCustomer(itineraryId, null);
    toast.success('Customer unlinked');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (itineraries.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Map className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-2">No saved itineraries</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Save itineraries from your chat conversations to access them here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="p-6 border-b border-border">
        <h2 className="font-display text-xl font-semibold text-foreground">
          {t('itineraries')}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {itineraries.length} saved itinerar{itineraries.length !== 1 ? 'ies' : 'y'}
        </p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {itineraries.map((itin) => {
            const config = typeConfig[itin.itinerary_type as keyof typeof typeConfig] || typeConfig.balanced;
            const status = statusConfig[itin.status || 'saved'];
            const customerName = getCustomerName(itin.customer_id);

            return (
              <Card key={itin.id} className="p-5 border shadow-soft">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className={cn("font-medium", config.badge)}>
                        {config.label}
                      </Badge>
                      <Badge variant={status.variant}>{status.label}</Badge>
                      
                      {/* Customer Badge */}
                      {customerName ? (
                        <Badge 
                          variant="secondary" 
                          className="flex items-center gap-1 cursor-pointer hover:bg-secondary/80"
                          onClick={() => handleUnlinkCustomer(itin.id)}
                        >
                          <User className="w-3 h-3" />
                          {customerName}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ) : (
                        <Dialog open={linkDialogOpen === itin.id} onOpenChange={(open) => {
                          setLinkDialogOpen(open ? itin.id : null);
                          if (!open) setSelectedCustomer('');
                        }}>
                          <DialogTrigger asChild>
                            <Badge 
                              variant="outline" 
                              className="flex items-center gap-1 cursor-pointer hover:bg-muted"
                            >
                              <UserPlus className="w-3 h-3" />
                              Link Customer
                            </Badge>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Link to Customer</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div>
                                <label className="text-sm font-medium mb-2 block">
                                  Select Customer
                                </label>
                                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose a customer..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {customersLoading ? (
                                      <div className="p-2 text-center text-muted-foreground">
                                        Loading...
                                      </div>
                                    ) : customers.length === 0 ? (
                                      <div className="p-2 text-center text-muted-foreground">
                                        No customers found. Add customers first.
                                      </div>
                                    ) : (
                                      customers.map((customer) => (
                                        <SelectItem key={customer.id} value={customer.id}>
                                          <div className="flex flex-col">
                                            <span>{customer.name}</span>
                                            {customer.email && (
                                              <span className="text-xs text-muted-foreground">
                                                {customer.email}
                                              </span>
                                            )}
                                          </div>
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setLinkDialogOpen(null);
                                    setSelectedCustomer('');
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={() => handleLinkCustomer(itin.id)}
                                  disabled={!selectedCustomer}
                                >
                                  Link Customer
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-foreground mb-3">{itin.title}</h3>

                    {/* Flight Info */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-2">
                      <Plane className="w-4 h-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {itin.details.flight.airline} {itin.details.flight.flightNo}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {itin.details.flight.departure.city} → {itin.details.flight.arrival.city}
                        </p>
                      </div>
                      <p className="text-sm font-medium">₹{itin.details.flight.price.toLocaleString()}</p>
                    </div>

                    {/* Hotel Info */}
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-3">
                      <Hotel className="w-4 h-4 text-accent" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {itin.details.hotel.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {itin.details.hotel.rating}⭐ • {itin.details.hotel.roomType}
                        </p>
                      </div>
                      <p className="text-sm font-medium">₹{itin.details.hotel.pricePerNight.toLocaleString()}/night</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <IndianRupee className="w-4 h-4" />
                          <span className="font-semibold text-foreground">
                            {itin.total_cost?.toLocaleString() || itin.details.totalCost.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {formatDistanceToNow(new Date(itin.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {itin.status !== 'booked' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateItineraryStatus(itin.id, 'booked')}
                          >
                            Mark Booked
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteItinerary(itin.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ItineraryList;