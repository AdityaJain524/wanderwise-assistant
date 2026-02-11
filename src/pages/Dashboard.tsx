import { useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTravelMode } from '@/contexts/TravelModeContext';
import Sidebar from '@/components/dashboard/Sidebar';
import ChatInterface from '@/components/dashboard/ChatInterface';
import CustomerList from '@/components/dashboard/CustomerList';
import ConversationList from '@/components/dashboard/ConversationList';
import BookingChecklist from '@/components/dashboard/BookingChecklist';
import { Loader2, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const Dashboard = () => {
  const { user, loading } = useAuth();
  const { hasSelectedLanguage } = useLanguage();
  const { hasSelectedMode } = useTravelMode();
  const [activeSection, setActiveSection] = useState('chat');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSelectConversation = useCallback((id: string) => {
    setConversationId(id);
    setActiveSection('chat');
    setIsMobileMenuOpen(false); // Close mobile menu on selection
  }, []);

  const handleConversationCreated = useCallback((id: string) => {
    setConversationId(id);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasSelectedLanguage) {
    return <Navigate to="/language" replace />;
  }

  if (!hasSelectedMode) {
    return <Navigate to="/travel-mode" replace />;
  }

  const handleNewChat = () => {
    setConversationId(null);
    setActiveSection('chat');
    setIsMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'customers':
        return <CustomerList />;
      case 'conversations':
        return (
          <ConversationList 
            onSelectConversation={handleSelectConversation}
            selectedId={conversationId}
          />
        );
      case 'checklists':
        return <BookingChecklist />;
      case 'chat':
      default:
        return (
          <ChatInterface 
            conversationId={conversationId}
            onConversationCreated={handleConversationCreated}
          />
        );
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50">
        <Sidebar
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          onNewChat={handleNewChat}
        />
      </div>

      {/* Mobile Header & Content */}
      <main className="flex-1 flex flex-col md:pl-64 h-full relative">
        {/* Mobile Menu Trigger - Visible only on mobile */}
        <div className="md:hidden p-4 border-b border-border flex items-center bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-r-0">
              <Sidebar
                activeSection={activeSection}
                setActiveSection={(section) => {
                  setActiveSection(section);
                  setIsMobileMenuOpen(false);
                }}
                onNewChat={handleNewChat}
                onClose={() => setIsMobileMenuOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <span className="font-semibold ml-2">TravelCopilot</span>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
