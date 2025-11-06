import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login";
import AppShell from "./components/layout/AppShell";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Planning from "./pages/Planning";
import Devis from "./pages/Devis";
import Factures from "./pages/Factures";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import Equipe from "./pages/Equipe";
import Timesheets from "./pages/Timesheets";
import Paiements from "./pages/Paiements";
import Parametres from "./pages/Parametres";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";
import DevisDetail from "./pages/DevisDetail";
import FactureDetail from "./pages/FactureDetail";
import { SupportBubble } from "./components/support/SupportBubble";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/auth/login" replace />} />
          <Route path="/auth/login" element={<Login />} />
          
          <Route element={<AppShell />}>
            <Route path="/tableau-de-bord" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/devis" element={<Devis />} />
            <Route path="/devis/:id" element={<DevisDetail />} />
            <Route path="/factures" element={<Factures />} />
            <Route path="/factures/:id" element={<FactureDetail />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/equipe" element={<Equipe />} />
            <Route path="/timesheets" element={<Timesheets />} />
            <Route path="/paiements" element={<Paiements />} />
            <Route path="/parametres" element={<Parametres />} />
            <Route path="/support" element={<Support />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <SupportBubble />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
