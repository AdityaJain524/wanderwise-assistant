import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { languages, Language } from '@/lib/languages';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Globe, Search, Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const LanguageSelect = () => {
  const { language, setLanguage } = useLanguage();
  const [selectedLang, setSelectedLang] = useState(language);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const filteredLanguages = languages.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleContinue = () => {
    setLanguage(selectedLang);
    navigate('/travel-mode');
  };

  const groupedLanguages = filteredLanguages.reduce((acc, lang) => {
    const region = lang.region;
    if (!acc[region]) acc[region] = [];
    acc[region].push(lang);
    return acc;
  }, {} as Record<string, Language[]>);

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
          <div className="mx-auto w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center mb-4 shadow-glow-accent">
            <Globe className="w-8 h-8 text-accent-foreground" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground mb-2">
            Choose Your Language
          </h1>
          <p className="text-muted-foreground">
            Select your preferred language for the app interface
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search languages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12"
          />
        </div>

        {/* Language Grid */}
        <div className="max-h-[400px] overflow-y-auto pr-2 space-y-6">
          {Object.entries(groupedLanguages).map(([region, langs]) => (
            <div key={region}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {region}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {langs.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLang(lang.code)}
                    className={cn(
                      "relative p-4 rounded-xl border-2 transition-all duration-200 text-left",
                      "hover:border-primary/50 hover:shadow-soft",
                      selectedLang === lang.code
                        ? "border-primary bg-primary/5 shadow-soft"
                        : "border-border bg-card"
                    )}
                  >
                    {selectedLang === lang.code && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full gradient-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    <div className="text-lg font-medium text-foreground">
                      {lang.nativeName}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {lang.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Continue Button */}
        <div className="mt-8 pt-6 border-t">
          <Button
            onClick={handleContinue}
            className="w-full h-12 gradient-primary text-primary-foreground font-medium text-lg"
          >
            Continue
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default LanguageSelect;