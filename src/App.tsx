import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Search from "./pages/Search.tsx";
import Settings from "./pages/Settings.tsx";

const queryClient = new QueryClient();

import { useEffect } from "react";
import { useDashboard } from "@/contexts/DashboardContext";

const BodyBackgroundManager = () => {
  const { databaseStatus } = useDashboard();

  useEffect(() => {
    if (databaseStatus.loaded) {
      document.body.classList.remove("bg-gradient-mesh");
    } else {
      document.body.classList.add("bg-gradient-mesh");
    }
  }, [databaseStatus.loaded]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <DashboardProvider>
          <BodyBackgroundManager />
          <Sonner />
          <BrowserRouter>
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/search" element={<Search />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AnimatePresence>
          </BrowserRouter>
        </DashboardProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

