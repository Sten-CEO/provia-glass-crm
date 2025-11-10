import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { initializeInventoryEventHandlers } from "./lib/inventoryEventHandlers";
import Login from "./pages/auth/Login";
import AppShell from "./components/layout/AppShell";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Contracts from "./pages/Contracts";
import ContractDetail from "./pages/ContractDetail";
import Planning from "./pages/Planning";
import Devis from "./pages/Devis";
import Factures from "./pages/Factures";
import Interventions from "./pages/Interventions";
import InterventionDetail from "./pages/InterventionDetail";
import InterventionEditor from "./pages/InterventionEditor";
import Equipe from "./pages/Equipe";
import Timesheets from "./pages/Timesheets";
import Paiements from "./pages/Paiements";
import Parametres from "./pages/Parametres";
import Support from "./pages/Support";
import PublicQuoteView from "./pages/PublicQuoteView";
import NotFound from "./pages/NotFound";
import DevisEditor from "./pages/DevisEditor";
import FactureDetail from "./pages/FactureDetail";
import FactureEditor from "./pages/FactureEditor";
import Inventaire from "./pages/inventaire/Inventaire";
import InventaireConsommables from "./pages/inventaire/InventaireConsommables";
import InventaireMateriels from "./pages/inventaire/InventaireMateriels";
import InventaireItemDetail from "./pages/inventaire/InventaireItemDetail";
import InventaireMouvements from "./pages/inventaire/InventaireMouvements";
import InventaireAchats from "./pages/inventaire/InventaireAchats";
import AchatEditor from "./pages/inventaire/AchatEditor";
import { SupportBubble } from "./components/support/SupportBubble";

const queryClient = new QueryClient();

const App = () => {
  // Initialize event handlers on app startup
  useEffect(() => {
    initializeInventoryEventHandlers();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/auth/login" replace />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/quote/:token" element={<PublicQuoteView />} />
          
          <Route element={<AppShell />}>
            <Route path="/tableau-de-bord" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/:id" element={<ClientDetail />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/contracts/:id" element={<ContractDetail />} />
            <Route path="/planning" element={<Planning />} />
          <Route path="/devis" element={<Devis />} />
          <Route path="/devis/new" element={<DevisEditor />} />
          <Route path="/devis/:id" element={<DevisEditor />} />
          <Route path="/factures" element={<Factures />} />
            <Route path="/factures/new" element={<FactureEditor />} />
            <Route path="/factures/:id" element={<FactureDetail />} />
            <Route path="/factures/:id/edit" element={<FactureEditor />} />
            
            {/* Interventions routes (renamed from jobs) */}
            <Route path="/interventions" element={<Interventions />} />
            <Route path="/interventions/nouvelle" element={<InterventionEditor />} />
            <Route path="/interventions/:id" element={<InterventionDetail />} />
            <Route path="/interventions/:id/editer" element={<InterventionEditor />} />
            
            {/* Legacy routes redirect to new interventions routes */}
            <Route path="/jobs" element={<Navigate to="/interventions" replace />} />
            <Route path="/jobs/:id" element={<Navigate to="/interventions/:id" replace />} />
            
            {/* Inventaire routes */}
            <Route path="/inventaire" element={<Navigate to="/inventaire/consommables" replace />} />
            <Route path="/inventaire/consommables" element={<InventaireConsommables />} />
            <Route path="/inventaire/materiels" element={<InventaireMateriels />} />
            <Route path="/inventaire/items/:id" element={<InventaireItemDetail />} />
            <Route path="/inventaire/mouvements" element={<InventaireMouvements />} />
            <Route path="/inventaire/achats" element={<InventaireAchats />} />
            <Route path="/inventaire/achats/nouveau" element={<AchatEditor />} />
            <Route path="/inventaire/achats/:id" element={<AchatEditor />} />
            
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
};

export default App;
