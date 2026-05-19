
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Store from "./pages/Store";
import NotFound from "./pages/NotFound";
import { BrandingBadge } from "./components/BrandingBadge";

// Marketing Module
import MarketingHome from "./pages/marketing/MarketingHome";
import MarketingAccess from "./pages/marketing/MarketingAccess";
import MarketingCheckout from "./pages/marketing/MarketingCheckout";
import MarketingOnboarding from "./pages/marketing/MarketingOnboarding";
import MarketingBriefing from "./pages/marketing/MarketingBriefing";
import MarketingAdmin from "./pages/marketing/MarketingAdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/invite" element={<Index />} />
            <Route path="/invitation" element={<Index />} />
            <Route path="/accept-invite" element={<Index />} />
            
            {/* Marketing Module Funnel */}
            <Route path="/marketing/home" element={<MarketingHome />} />
            <Route path="/marketing/access" element={<MarketingAccess />} />
            <Route path="/marketing/checkout/:tier" element={<MarketingCheckout />} />
            <Route path="/marketing/onboarding" element={<MarketingOnboarding />} />
            <Route path="/marketing/briefing" element={<MarketingBriefing />} />
            <Route path="/marketing/admin/dashboard" element={<MarketingAdmin />} />
            <Route path="/store" element={<Store />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <BrandingBadge />
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
