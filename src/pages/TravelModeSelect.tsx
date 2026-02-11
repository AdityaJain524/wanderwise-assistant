import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTravelMode, TravelMode } from '@/contexts/TravelModeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bus, Train, Plane, Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const travelModes = [
  {
    id: 'bus' as TravelMode,
    name: 'Bus',
    description: 'Economical travel by road with flexible schedules',
    icon: Bus,
    color: 'from-green-500 to-emerald-600',
    glow: 'shadow-green-500/30',
  },
  {
    id: 'train' as TravelMode,
    name: 'Train',
    description: 'Comfortable rail journeys with scenic views',
    icon: Train,
    color: 'from-blue-500 to-indigo-600',
    glow: 'shadow-blue-500/30',
  },
  {
    id: 'plane' as TravelMode,
    name: 'Plane',
    description: 'Fast air travel for long distances',
    icon: Plane,
    color: 'from-purple-500 to-violet-600',
    glow: 'shadow-purple-500/30',
  },
];

const TravelModeSelect = () => {
  const { travelMode, setTravelMode } = useTravelMode();
  const { t } = useLanguage();
  const [selectedMode, setSelectedMode] = useState<TravelMode | null>(travelMode);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (selectedMode) {
      setTravelMode(selectedMode);
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-10 left-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse-soft" />
      </div>

      <Card className="w-full max-w-2xl shadow-elevated border-0 p-6 animate-scale-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-glow-primary">
            <Plane className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground mb-2">
            Choose Your Travel Mode
          </h1>
          <p className="text-muted-foreground">
            Select how you prefer to travel. The AI will show options based on your choice.
          </p>
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {travelModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              className={cn(
                "relative p-6 rounded-2xl border-2 transition-all duration-300 text-center",
                "hover:scale-105 hover:shadow-lg",
                selectedMode === mode.id
                  ? `border-primary bg-gradient-to-br ${mode.color} text-white shadow-xl ${mode.glow}`
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              {selectedMode === mode.id && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
              <div className={cn(
                "w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center",
                selectedMode === mode.id ? "bg-white/20" : `bg-gradient-to-br ${mode.color}`
              )}>
                <mode.icon className={cn(
                  "w-7 h-7",
                  selectedMode === mode.id ? "text-white" : "text-white"
                )} />
              </div>
              <h3 className={cn(
                "text-xl font-semibold mb-2",
                selectedMode === mode.id ? "text-white" : "text-foreground"
              )}>
                {mode.name}
              </h3>
              <p className={cn(
                "text-sm",
                selectedMode === mode.id ? "text-white/80" : "text-muted-foreground"
              )}>
                {mode.description}
              </p>
            </button>
          ))}
        </div>

        {/* Continue Button */}
        <Button
          onClick={handleContinue}
          disabled={!selectedMode}
          className="w-full h-12 gradient-primary text-primary-foreground font-medium text-lg disabled:opacity-50"
        >
          Continue
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </Card>
    </div>
  );
};

export default TravelModeSelect;
