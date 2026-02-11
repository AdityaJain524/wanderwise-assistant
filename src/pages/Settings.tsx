import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTravelMode, TravelMode } from '@/contexts/TravelModeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { languages } from '@/lib/languages';
import { ArrowLeft, Globe, Bus, Train, Plane, Check, Settings as SettingsIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Navigate } from 'react-router-dom';

const travelModes = [
  { id: 'bus' as TravelMode, name: 'Bus', icon: Bus, color: 'from-green-500 to-emerald-600' },
  { id: 'train' as TravelMode, name: 'Train', icon: Train, color: 'from-blue-500 to-indigo-600' },
  { id: 'plane' as TravelMode, name: 'Plane', icon: Plane, color: 'from-purple-500 to-violet-600' },
];

const Settings = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { travelMode, setTravelMode } = useTravelMode();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const currentLanguage = languages.find(l => l.code === language);

  return (
    <div className="min-h-screen gradient-hero p-4 md:p-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/dashboard')}
        className="mb-6 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-glow-primary">
            <SettingsIcon className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground mb-2">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Customize your preferences
          </p>
        </div>

        {/* Language Settings */}
        <Card className="shadow-elevated border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center">
                <Globe className="w-5 h-5 text-accent-foreground" />
              </div>
              Change Language
            </CardTitle>
            <CardDescription>
              Current: {currentLanguage?.nativeName} ({currentLanguage?.name})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={cn(
                    "relative p-3 rounded-xl border-2 transition-all duration-200 text-left",
                    "hover:border-primary/50 hover:shadow-soft",
                    language === lang.code
                      ? "border-primary bg-primary/5 shadow-soft"
                      : "border-border bg-card"
                  )}
                >
                  {language === lang.code && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full gradient-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  <div className="text-sm font-medium text-foreground">
                    {lang.nativeName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {lang.name}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Travel Mode Settings */}
        <Card className="shadow-elevated border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Plane className="w-5 h-5 text-primary-foreground" />
              </div>
              Change Travel Mode
            </CardTitle>
            <CardDescription>
              Current: {travelModes.find(m => m.id === travelMode)?.name || 'Not selected'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {travelModes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setTravelMode(mode.id)}
                  className={cn(
                    "relative p-4 rounded-xl border-2 transition-all duration-200 text-center",
                    "hover:scale-105 hover:shadow-lg",
                    travelMode === mode.id
                      ? `border-transparent bg-gradient-to-br ${mode.color} text-white shadow-xl`
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  {travelMode === mode.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className={cn(
                    "w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center",
                    travelMode === mode.id ? "bg-white/20" : `bg-gradient-to-br ${mode.color}`
                  )}>
                    <mode.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className={cn(
                    "text-sm font-medium",
                    travelMode === mode.id ? "text-white" : "text-foreground"
                  )}>
                    {mode.name}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
