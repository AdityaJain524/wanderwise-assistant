import { useLanguage } from '@/contexts/LanguageContext';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { DollarSign, Zap, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradeoffSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const TradeoffSlider = ({ value, onChange }: TradeoffSliderProps) => {
  const { t } = useLanguage();

  const getActiveOption = () => {
    if (value < 33) return 'cheapest';
    if (value < 66) return 'fastest';
    return 'comfort';
  };

  const activeOption = getActiveOption();

  return (
    <Card className="p-4 bg-card border border-border shadow-soft">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-foreground">
            {t('tradeoffControl')}
          </h4>
          <span className="text-xs text-muted-foreground">
            Adjust to update recommendations
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Cheapest */}
          <div
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-200",
              activeOption === 'cheapest' ? "opacity-100" : "opacity-40"
            )}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200",
                activeOption === 'cheapest'
                  ? "gradient-primary shadow-glow-primary"
                  : "bg-muted"
              )}
            >
              <DollarSign
                className={cn(
                  "w-5 h-5",
                  activeOption === 'cheapest' ? "text-primary-foreground" : "text-muted-foreground"
                )}
              />
            </div>
            <span className="text-xs font-medium">{t('cheapest')}</span>
          </div>

          {/* Slider */}
          <div className="flex-1">
            <Slider
              value={[value]}
              onValueChange={(v) => onChange(v[0])}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* Fastest */}
          <div
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-200",
              activeOption === 'fastest' ? "opacity-100" : "opacity-40"
            )}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200",
                activeOption === 'fastest'
                  ? "bg-blue-500 shadow-lg shadow-blue-500/30"
                  : "bg-muted"
              )}
            >
              <Zap
                className={cn(
                  "w-5 h-5",
                  activeOption === 'fastest' ? "text-white" : "text-muted-foreground"
                )}
              />
            </div>
            <span className="text-xs font-medium">{t('fastest')}</span>
          </div>

          {/* Most Comfortable */}
          <div
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-200",
              activeOption === 'comfort' ? "opacity-100" : "opacity-40"
            )}
          >
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200",
                activeOption === 'comfort'
                  ? "gradient-accent shadow-glow-accent"
                  : "bg-muted"
              )}
            >
              <Heart
                className={cn(
                  "w-5 h-5",
                  activeOption === 'comfort' ? "text-accent-foreground" : "text-muted-foreground"
                )}
              />
            </div>
            <span className="text-xs font-medium">{t('mostComfortable')}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TradeoffSlider;