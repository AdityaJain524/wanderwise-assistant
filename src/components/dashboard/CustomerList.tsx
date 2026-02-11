import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { 
  Plus, User, Mail, Phone, Search, Loader2, Edit, Trash2,
  Plane, Hotel, IndianRupee, Heart, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCustomers, Customer, CustomerPreferences } from '@/hooks/useCustomers';

const defaultPreferences: CustomerPreferences = {
  budgetSensitivity: 50,
  preferredAirlines: [],
  hotelType: 'any',
  comfortPriority: 50,
  mealPreference: 'any',
  seatPreference: 'any',
  specialNeeds: [],
};

const airlineOptions = ['IndiGo', 'Air India', 'Vistara', 'SpiceJet', 'GoAir', 'AirAsia'];
const specialNeedsOptions = ['Wheelchair', 'Senior Citizen', 'Infant', 'Vegetarian Meals', 'Medical Assistance'];

const CustomerList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { customers, loading, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const [searchQuery, setSearchQuery] = useState('');

  const handleAnalyzeWithAI = (customer: Customer) => {
    // In a real app, we might pass state or use a global store
    // For now, let's navigate to dashboard and maybe use a query param
    // or rely on the fact that the ChatInterface can pick up the customer
    toast.success(`Analyzing ${customer.name}'s profile...`);
    navigate('/dashboard');
  };
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [preferences, setPreferences] = useState<CustomerPreferences>(defaultPreferences);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', notes: '' });
    setPreferences(defaultPreferences);
    setEditingCustomer(null);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      notes: customer.notes || '',
    });
    setPreferences(customer.preferences || defaultPreferences);
    setIsDialogOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!formData.name.trim() || !user) {
      toast.error('Please enter a customer name');
      return;
    }

    setSaving(true);

    const customerData = {
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      notes: formData.notes || null,
      preferences: preferences,
    };

    let success = false;
    if (editingCustomer) {
      success = await updateCustomer(editingCustomer.id, customerData);
    } else {
      const id = await addCustomer(customerData);
      success = !!id;
    }

    setSaving(false);

    if (!success) {
      toast.error(editingCustomer ? 'Failed to update customer' : 'Failed to add customer');
    } else {
      toast.success(editingCustomer ? 'Customer updated successfully' : 'Customer added successfully');
      setIsDialogOpen(false);
      resetForm();
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    const success = await deleteCustomer(id);
    if (success) {
      toast.success('Customer deleted');
    } else {
      toast.error('Failed to delete customer');
    }
  };

  const toggleAirline = (airline: string) => {
    setPreferences(prev => ({
      ...prev,
      preferredAirlines: prev.preferredAirlines.includes(airline)
        ? prev.preferredAirlines.filter(a => a !== airline)
        : [...prev.preferredAirlines, airline],
    }));
  };

  const toggleSpecialNeed = (need: string) => {
    setPreferences(prev => ({
      ...prev,
      specialNeeds: prev.specialNeeds.includes(need)
        ? prev.specialNeeds.filter(n => n !== need)
        : [...prev.specialNeeds, need],
    }));
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            {t('customers')}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your customer profiles and preferences
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              {t('addCustomer')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Edit Customer' : t('addCustomer')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('customerName')} *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>{t('customerEmail')}</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>{t('customerPhone')}</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="space-y-4">
                <h3 className="font-medium text-foreground flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Travel Preferences
                </h3>

                {/* Budget Sensitivity */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Budget Sensitivity</Label>
                    <span className="text-sm text-muted-foreground">
                      {preferences.budgetSensitivity < 33 ? 'Very Price-Conscious' : 
                       preferences.budgetSensitivity < 66 ? 'Balanced' : 'Budget Flexible'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <IndianRupee className="w-4 h-4 text-emerald-500" />
                    <Slider
                      value={[preferences.budgetSensitivity]}
                      onValueChange={([v]) => setPreferences({ ...preferences, budgetSensitivity: v })}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground w-8">{preferences.budgetSensitivity}%</span>
                  </div>
                </div>

                {/* Comfort Priority */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Comfort Priority</Label>
                    <span className="text-sm text-muted-foreground">
                      {preferences.comfortPriority < 33 ? 'Cost over Comfort' : 
                       preferences.comfortPriority < 66 ? 'Balanced' : 'Comfort First'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">💰</span>
                    <Slider
                      value={[preferences.comfortPriority]}
                      onValueChange={([v]) => setPreferences({ ...preferences, comfortPriority: v })}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm">✨</span>
                  </div>
                </div>

                {/* Preferred Airlines */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Plane className="w-4 h-4" />
                    Preferred Airlines
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {airlineOptions.map(airline => (
                      <Badge
                        key={airline}
                        variant={preferences.preferredAirlines.includes(airline) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-all",
                          preferences.preferredAirlines.includes(airline) && "bg-primary"
                        )}
                        onClick={() => toggleAirline(airline)}
                      >
                        {airline}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Hotel Type */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Hotel className="w-4 h-4" />
                      Hotel Type
                    </Label>
                    <Select
                      value={preferences.hotelType}
                      onValueChange={(v) => setPreferences({ ...preferences, hotelType: v as CustomerPreferences['hotelType'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="budget">Budget (2-3⭐)</SelectItem>
                        <SelectItem value="standard">Standard (3-4⭐)</SelectItem>
                        <SelectItem value="luxury">Luxury (4-5⭐)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Seat Preference</Label>
                    <Select
                      value={preferences.seatPreference}
                      onValueChange={(v) => setPreferences({ ...preferences, seatPreference: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="window">Window</SelectItem>
                        <SelectItem value="aisle">Aisle</SelectItem>
                        <SelectItem value="extra-legroom">Extra Legroom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Special Needs */}
                <div className="space-y-2">
                  <Label>Special Requirements</Label>
                  <div className="flex flex-wrap gap-2">
                    {specialNeedsOptions.map(need => (
                      <Badge
                        key={need}
                        variant={preferences.specialNeeds.includes(need) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-all",
                          preferences.specialNeeds.includes(need) && "bg-accent text-accent-foreground"
                        )}
                        onClick={() => toggleSpecialNeed(need)}
                      >
                        {need}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>{t('notes')}</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional preferences, special requirements, etc."
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsDialogOpen(false)}
                >
                  {t('cancel')}
                </Button>
                <Button
                  className="flex-1 gradient-primary text-primary-foreground"
                  onClick={handleSaveCustomer}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : t('save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search customers..."
          className="pl-11"
        />
      </div>

      {/* Customer List */}
      <ScrollArea className="flex-1">
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">No customers yet</h3>
            <p className="text-sm text-muted-foreground">
              Add your first customer to get started
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCustomers.map((customer) => (
              <Card key={customer.id} className="shadow-soft hover:shadow-card transition-all duration-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-semibold text-primary-foreground">
                        {customer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-foreground truncate">{customer.name}</h3>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEditDialog(customer)}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteCustomer(customer.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                          <Mail className="w-3.5 h-3.5" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                      
                      {/* Preferences Summary */}
                      {customer.preferences && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {customer.preferences.preferredAirlines?.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              <Plane className="w-3 h-3 mr-1" />
                              {customer.preferences.preferredAirlines.slice(0, 2).join(', ')}
                            </Badge>
                          )}
                          {customer.preferences.hotelType && customer.preferences.hotelType !== 'any' && (
                            <Badge variant="secondary" className="text-xs">
                              <Hotel className="w-3 h-3 mr-1" />
                              {customer.preferences.hotelType}
                            </Badge>
                          )}
                          {customer.preferences.specialNeeds?.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              +{customer.preferences.specialNeeds.length} needs
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {customer.notes && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {customer.notes}
                        </p>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 gap-2 text-xs border-primary/20 hover:bg-primary/5 hover:text-primary"
                        onClick={() => handleAnalyzeWithAI(customer)}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Analyze with AI
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default CustomerList;
