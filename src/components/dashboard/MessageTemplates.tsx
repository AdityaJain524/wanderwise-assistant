import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, MessageSquare, Copy, Check, Edit, Save, X, 
  Plane, Hotel, IndianRupee, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { Itinerary } from '@/lib/mockData';
import { cn } from '@/lib/utils';

interface MessageTemplatesProps {
  itinerary?: Itinerary;
  customerName?: string;
  customerEmail?: string;
  agentName?: string;
}

const defaultTemplates = {
  email: {
    itinerary: `Dear {customerName},

I hope this email finds you well! I'm pleased to share the travel itinerary I've carefully curated based on your preferences.

📅 TRIP DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━

✈️ FLIGHT INFORMATION
Airline: {airline} {flightNo}
Route: {departureCity} → {arrivalCity}
Departure: {departureTime} on {departureDate}
Arrival: {arrivalTime}
Duration: {duration}
Price: ₹{flightPrice} per person

🏨 HOTEL ACCOMMODATION
Hotel: {hotelName}
Rating: {hotelRating}⭐
Room Type: {roomType}
Price: ₹{hotelPrice} per night
Amenities: {amenities}

💰 TOTAL COST: ₹{totalCost}

━━━━━━━━━━━━━━━━━━━━━━━━━━

Please review the details and let me know if you'd like to proceed with this booking or if you have any questions.

Best regards,
{agentName}
Travel Agent`,

    followUp: `Dear {customerName},

I wanted to follow up on the travel itinerary I shared with you earlier. Please let me know if:

✅ You'd like to proceed with the booking
✅ You need any modifications to the itinerary
✅ You have any questions about the trip

I'm here to help make your travel experience seamless!

Best regards,
{agentName}`,

    confirmation: `Dear {customerName},

Great news! 🎉 Your booking has been confirmed!

Here are your booking details:

📍 Trip: {departureCity} → {arrivalCity}
📅 Date: {departureDate}
💰 Total Paid: ₹{totalCost}

NEXT STEPS:
1. ✅ E-tickets will be sent to your email shortly
2. ✅ Hotel confirmation number will follow
3. ✅ Please keep your ID documents ready

Safe travels!

Best regards,
{agentName}`
  },
  whatsapp: {
    itinerary: `🌟 *Travel Itinerary for {customerName}* 🌟

✈️ *FLIGHT*
{airline} {flightNo}
📍 {departureCity} → {arrivalCity}
🕐 {departureTime} - {arrivalTime}
💰 ₹{flightPrice}/person

🏨 *HOTEL*
{hotelName} ({hotelRating}⭐)
{roomType}
💰 ₹{hotelPrice}/night

━━━━━━━━━━━━━
*TOTAL: ₹{totalCost}*
━━━━━━━━━━━━━

Reply with ✅ to book or ❓ for questions!

- {agentName}`,

    followUp: `Hi {customerName} 👋

Just checking in about the travel itinerary I sent!

Let me know if you:
✅ Want to book
✏️ Need changes
❓ Have questions

Happy to help! 😊

- {agentName}`,

    confirmation: `🎉 *BOOKING CONFIRMED!* 🎉

Hi {customerName}!

Your trip is booked! ✅

📍 {departureCity} → {arrivalCity}
📅 {departureDate}
💰 ₹{totalCost}

E-tickets coming soon! 📧

Safe travels! ✈️

- {agentName}`
  }
};

const MessageTemplates = ({ 
  itinerary, 
  customerName = '[Customer Name]', 
  customerEmail = '',
  agentName = 'Your Travel Agent' 
}: MessageTemplatesProps) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'email' | 'whatsapp'>('email');
  const [activeTemplate, setActiveTemplate] = useState<'itinerary' | 'followUp' | 'confirmation'>('itinerary');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const replaceVariables = (template: string): string => {
    const replacements: Record<string, string> = {
      '{customerName}': customerName,
      '{customerEmail}': customerEmail,
      '{agentName}': agentName,
      '{airline}': itinerary?.flight.airline || '[Airline]',
      '{flightNo}': itinerary?.flight.flightNo || '[Flight No]',
      '{departureCity}': itinerary?.flight.departure.city || '[City]',
      '{arrivalCity}': itinerary?.flight.arrival.city || '[City]',
      '{departureTime}': itinerary?.flight.departure.time || '[Time]',
      '{departureDate}': itinerary?.flight.departure.date || '[Date]',
      '{arrivalTime}': itinerary?.flight.arrival.time || '[Time]',
      '{duration}': itinerary?.flight.duration || '[Duration]',
      '{flightPrice}': itinerary?.flight.price.toLocaleString() || '[Price]',
      '{hotelName}': itinerary?.hotel.name || '[Hotel]',
      '{hotelRating}': itinerary?.hotel.rating.toString() || '[Rating]',
      '{roomType}': itinerary?.hotel.roomType || '[Room Type]',
      '{hotelPrice}': itinerary?.hotel.pricePerNight.toLocaleString() || '[Price]',
      '{amenities}': itinerary?.hotel.amenities.join(', ') || '[Amenities]',
      '{totalCost}': itinerary?.totalCost.toLocaleString() || '[Total]',
    };

    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    }
    return result;
  };

  const getCurrentContent = (): string => {
    if (isEditing && editedContent) return editedContent;
    return replaceVariables(defaultTemplates[activeTab][activeTemplate]);
  };

  const handleCopy = async (key: string) => {
    const content = getCurrentContent();
    await navigator.clipboard.writeText(content);
    setCopiedStates({ ...copiedStates, [key]: true });
    toast.success('Message copied to clipboard!');
    setTimeout(() => {
      setCopiedStates({ ...copiedStates, [key]: false });
    }, 2000);
  };

  const handleEdit = () => {
    setEditedContent(getCurrentContent());
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    toast.success('Template updated');
  };

  const handleCancelEdit = () => {
    setEditedContent('');
    setIsEditing(false);
  };

  const templateOptions = [
    { id: 'itinerary', label: 'Itinerary', icon: Plane },
    { id: 'followUp', label: 'Follow-up', icon: Calendar },
    { id: 'confirmation', label: 'Confirmation', icon: Check },
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="w-5 h-5 text-primary" />
          Message Templates
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'email' | 'whatsapp')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </TabsTrigger>
          </TabsList>

          {/* Template Type Selector */}
          <div className="flex gap-2 mb-4">
            {templateOptions.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={activeTemplate === id ? "default" : "outline"}
                size="sm"
                className={cn(
                  "flex-1",
                  activeTemplate === id && "gradient-primary text-primary-foreground"
                )}
                onClick={() => {
                  setActiveTemplate(id as typeof activeTemplate);
                  setIsEditing(false);
                  setEditedContent('');
                }}
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {label}
              </Button>
            ))}
          </div>

          <TabsContent value={activeTab} className="flex-1 flex flex-col mt-0">
            <div className="flex-1 flex flex-col">
              {/* Preview/Edit Area */}
              <ScrollArea className="flex-1 border rounded-lg p-4 bg-muted/30 mb-4">
                {isEditing ? (
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="min-h-[300px] bg-background"
                    placeholder="Edit your message template..."
                  />
                ) : (
                  <pre className="text-sm whitespace-pre-wrap font-sans text-foreground">
                    {getCurrentContent()}
                  </pre>
                )}
              </ScrollArea>

              {/* Actions */}
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleCancelEdit}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 gradient-primary text-primary-foreground"
                      onClick={handleSaveEdit}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleEdit}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      className="flex-1 gradient-primary text-primary-foreground"
                      onClick={() => handleCopy(`${activeTab}-${activeTemplate}`)}
                    >
                      {copiedStates[`${activeTab}-${activeTemplate}`] ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Message
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>

              {/* Variable hints */}
              <div className="mt-4">
                <p className="text-xs text-muted-foreground mb-2">Available variables:</p>
                <div className="flex flex-wrap gap-1">
                  {['{customerName}', '{agentName}', '{totalCost}', '{departureCity}', '{arrivalCity}'].map(v => (
                    <Badge key={v} variant="secondary" className="text-xs">
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MessageTemplates;
