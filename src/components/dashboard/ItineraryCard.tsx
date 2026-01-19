import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Plane, 
  Hotel, 
  Clock, 
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ChevronDown,
  CheckCircle2,
  Sparkles,
  Copy,
  UtensilsCrossed,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Itinerary } from '@/lib/mockData';
import { toast } from 'sonner';

interface ItineraryCardProps {
  itinerary: Itinerary;
}

const ItineraryCard = ({ itinerary }: ItineraryCardProps) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const typeConfig = {
    budget: {
      label: t('budget'),
      gradient: 'from-emerald-500 to-teal-600',
      badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    },
    balanced: {
      label: t('balanced'),
      gradient: 'from-blue-500 to-indigo-600',
      badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    },
    comfort: {
      label: t('comfort'),
      gradient: 'from-amber-500 to-orange-600',
      badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    },
  };

  const config = typeConfig[itinerary.type];

  const getTrendIcon = () => {
    switch (itinerary.priceTrend) {
      case 'rising':
        return <TrendingUp className="w-4 h-4 text-destructive" />;
      case 'dropping':
        return <TrendingDown className="w-4 h-4 text-success" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendLabel = () => {
    switch (itinerary.priceTrend) {
      case 'rising':
        return t('priceRising');
      case 'dropping':
        return t('priceDropping');
      default:
        return t('priceStable');
    }
  };

  const getBookingUrl = () => {
    const from = itinerary.flight.departure.city.toLowerCase();
    const to = itinerary.flight.arrival.city.toLowerCase();
    const date = itinerary.flight.departure.date;
    const city = itinerary.hotel.city.toLowerCase().replace(/\s+/g, '-');
    
    // Generate booking URLs for popular Indian travel platforms
    const bookingUrls = {
      flight: `https://www.makemytrip.com/flight/search?itinerary=${from}-${to}-${date}&tripType=O&paxType=A-1_C-0_I-0&cabinClass=E`,
      hotel: `https://www.booking.com/searchresults.html?ss=${itinerary.hotel.city}`,
      restaurant: `https://www.zomato.com/${city}/restaurants`,
      dineout: `https://www.swiggy.com/dineout/${city}`,
    };
    
    return bookingUrls;
  };

  const handleBookNow = () => {
    const urls = getBookingUrl();
    // Open flight booking in new tab
    window.open(urls.flight, '_blank', 'noopener,noreferrer');
    toast.success('Opening booking website...');
  };

  const handleBookHotel = () => {
    const urls = getBookingUrl();
    window.open(urls.hotel, '_blank', 'noopener,noreferrer');
    toast.success('Opening hotel booking website...');
  };

  const handleBookRestaurant = () => {
    const urls = getBookingUrl();
    window.open(urls.restaurant, '_blank', 'noopener,noreferrer');
    toast.success('Opening restaurant booking website...');
  };

  const handleGenerateMessage = () => {
    const message = `Dear Customer,

I'm pleased to share the ${config.label} travel package for your upcoming trip:

✈️ Flight: ${itinerary.flight.airline} ${itinerary.flight.flightNo}
   ${itinerary.flight.departure.city} → ${itinerary.flight.arrival.city}
   Departure: ${itinerary.flight.departure.time}

🏨 Hotel: ${itinerary.hotel.name} (${itinerary.hotel.rating}⭐)
   Room: ${itinerary.hotel.roomType}

💰 Total Cost: ₹${itinerary.totalCost.toLocaleString()}

Please let me know if you'd like to proceed with this booking.

Best regards,
Your Travel Agent`;

    navigator.clipboard.writeText(message);
    toast.success('Message copied to clipboard!');
  };

  return (
    <Card className="overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300 border-0">
      {/* Header with gradient */}
      <div className={cn("h-2 bg-gradient-to-r", config.gradient)} />
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={cn("font-medium", config.badge)}>
              {config.label}
            </Badge>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {getTrendIcon()}
              <span>{getTrendLabel()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="flex items-center text-2xl font-bold text-foreground">
                <IndianRupee className="w-5 h-5" />
                {itinerary.totalCost.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">{t('totalCost')}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Flight Info */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
          <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
            <Plane className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-foreground">
                {itinerary.flight.airline} {itinerary.flight.flightNo}
              </p>
              {itinerary.flight.isRedEye && (
                <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/20">
                  Red-eye
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{itinerary.flight.departure.city}</span>
              <span>→</span>
              <span>{itinerary.flight.arrival.city}</span>
              <span className="mx-2">•</span>
              <Clock className="w-3 h-3" />
              <span>{itinerary.flight.duration}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium text-foreground">₹{itinerary.flight.price.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">per person</p>
          </div>
        </div>

        {/* Hotel Info */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
          <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center flex-shrink-0">
            <Hotel className="w-5 h-5 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">{itinerary.hotel.name}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{itinerary.hotel.rating}⭐</span>
              <span className="mx-1">•</span>
              <span>{itinerary.hotel.roomType}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium text-foreground">₹{itinerary.hotel.pricePerNight.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">per night</p>
          </div>
        </div>

        {/* Confidence Score */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-success/5 border border-success/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-success">Confidence Score</span>
          </div>
          <span className="text-lg font-bold text-success">{itinerary.confidenceScore}%</span>
        </div>

        {/* Expandable Details */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                {t('explanation')}
              </span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            {/* Why This Option */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success" />
                Why this option?
              </h4>
              <ul className="space-y-1.5">
                {itinerary.explanation.map((item, index) => (
                  <li key={index} className="text-sm text-muted-foreground pl-6">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Risk Warnings */}
            {itinerary.risks.length > 0 && (
              <div className="space-y-2 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                <h4 className="text-sm font-medium text-destructive flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {t('risk')} Warnings
                </h4>
                <ul className="space-y-1.5">
                  {itinerary.risks.map((risk, index) => (
                    <li key={index} className="text-sm text-destructive/80 pl-6">
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Hotel Amenities */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Hotel Amenities</h4>
              <div className="flex flex-wrap gap-2">
                {itinerary.hotel.amenities.map((amenity, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {amenity}
                  </Badge>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <div className="flex gap-2">
            <Button
              className={cn(
                "flex-1 font-medium text-xs sm:text-sm",
                itinerary.priceTrend === 'dropping' 
                  ? "gradient-primary text-primary-foreground" 
                  : "bg-foreground text-background hover:bg-foreground/90"
              )}
              onClick={itinerary.priceTrend === 'dropping' ? undefined : handleBookNow}
            >
              <Plane className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{itinerary.priceTrend === 'dropping' ? t('waitForBetterPrice') : t('bookNow')}</span>
              <span className="sm:hidden">Flight</span>
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-xs sm:text-sm"
              onClick={handleBookHotel}
            >
              <Hotel className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Book Hotel</span>
              <span className="sm:hidden">Hotel</span>
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-xs sm:text-sm"
              onClick={handleBookRestaurant}
            >
              <UtensilsCrossed className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Book Restaurant</span>
              <span className="sm:hidden">Dine</span>
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerateMessage}
            className="w-full"
          >
            <Copy className="w-4 h-4 mr-2" />
            {t('generateMessage')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ItineraryCard;