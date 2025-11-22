import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { initializeInventoryEventHandlers } from "./lib/inventoryEventHandlers";
import Login from "./pages/auth/Login";
import AdminLayout from "./components/layout/AppShell";
import { EmployeeLayout } from "./components/employee/EmployeeLayout";
import { EmployeeLogin } from "./pages/employee/EmployeeLogin";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { EmployeeDashboard } from "./pages/employee/EmployeeDashboard";
import { EmployeeJobs } from "./pages/employee/EmployeeJobs";
import { EmployeeInterventionDetail } from "./pages/employee/EmployeeInterventionDetail";
import { EmployeePlanning } from "./pages/employee/EmployeePlanning";
import { EmployeeTimesheets } from "./pages/employee/EmployeeTimesheets";
import { EmployeeSupport } from "./pages/employee/EmployeeSupport";
import { EmployeeProfile } from "./pages/employee/EmployeeProfile";
import { EmployeeFiles } from "./pages/employee/EmployeeFiles";
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
import InterventionsHistory from "./pages/InterventionsHistory";
import Equipe from "./pages/Equipe";
import EmployeeDetail from "./pages/EmployeeDetail";
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
import Employes from "./pages/pointage/Employes";
import EmployeePointageDetail from "./pages/pointage/EmployeeDetail";
import Agenda from "./pages/Agenda";
import AgendaDetail from "./pages/AgendaDetail";
import CADetail from "./pages/dashboard/CADetail";
import Profil from "./pages/Profil";
import Notifications from "./pages/Notifications";

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
          
          {/* Employee PWA Routes */}
          <Route path="/employee/login" element={<EmployeeLogin />} />
          <Route element={<EmployeeLayout />}>
            <Route path="/employee" element={<EmployeeDashboard />} />
            <Route path="/employee/jobs" element={<EmployeeJobs />} />
            <Route path="/employee/jobs/:id" element={<EmployeeInterventionDetail />} />
            <Route path="/employee/planning" element={<EmployeePlanning />} />
            <Route path="/employee/files" element={<EmployeeFiles />} />
            <Route path="/employee/timesheets" element={<EmployeeTimesheets />} />
            <Route path="/employee/support" element={<EmployeeSupport />} />
            <Route path="/employee/profile" element={<EmployeeProfile />} />
          </Route>
          
          {/* Admin CRM Routes */}
          <Route element={<AdminLayout />}>
            <Route path="/tableau-de-bord" element={<ProtectedRoute requiredAccess="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute requiredAccess="clients"><Clients /></ProtectedRoute>} />
            <Route path="/clients/:id" element={<ProtectedRoute requiredAccess="clients"><ClientDetail /></ProtectedRoute>} />
            <Route path="/contracts" element={<ProtectedRoute requiredAccess="clients"><Contracts /></ProtectedRoute>} />
            <Route path="/contracts/:id" element={<ProtectedRoute requiredAccess="clients"><ContractDetail /></ProtectedRoute>} />
            <Route path="/planning" element={<ProtectedRoute requiredAccess="planning"><Planning /></ProtectedRoute>} />
          <Route path="/devis" element={<ProtectedRoute requiredAccess="devis"><Devis /></ProtectedRoute>} />
          <Route path="/devis/new" element={<ProtectedRoute requiredAccess="devis"><DevisEditor /></ProtectedRoute>} />
          <Route path="/devis/:id" element={<ProtectedRoute requiredAccess="devis"><DevisEditor /></ProtectedRoute>} />
          <Route path="/factures" element={<ProtectedRoute requiredAccess="factures"><Factures /></ProtectedRoute>} />
            <Route path="/factures/new" element={<ProtectedRoute requiredAccess="factures"><FactureEditor /></ProtectedRoute>} />
            <Route path="/factures/:id" element={<ProtectedRoute requiredAccess="factures"><FactureDetail /></ProtectedRoute>} />
            <Route path="/factures/:id/edit" element={<ProtectedRoute requiredAccess="factures"><FactureEditor /></ProtectedRoute>} />
            
            {/* Interventions routes (renamed from jobs) */}
            <Route path="/interventions" element={<ProtectedRoute requiredAccess="jobs"><Interventions /></ProtectedRoute>} />
            <Route path="/interventions/nouvelle" element={<ProtectedRoute requiredAccess="jobs"><InterventionEditor /></ProtectedRoute>} />
            <Route path="/interventions/history" element={<ProtectedRoute requiredAccess="jobs"><InterventionsHistory /></ProtectedRoute>} />
            <Route path="/interventions/:id/report" element={<ProtectedRoute requiredAccess="jobs"><InterventionDetail /></ProtectedRoute>} />
            <Route path="/interventions/:id/editer" element={<ProtectedRoute requiredAccess="jobs"><InterventionEditor /></ProtectedRoute>} />

            {/* Legacy routes redirect to new interventions routes */}
            <Route path="/jobs" element={<Navigate to="/interventions" replace />} />
            <Route path="/jobs/:id" element={<Navigate to="/interventions/:id/report" replace />} />

            {/* Inventaire routes */}
            <Route path="/inventaire" element={<Navigate to="/inventaire/consommables" replace />} />
            <Route path="/inventaire/consommables" element={<ProtectedRoute requiredAccess="inventaire"><InventaireConsommables /></ProtectedRoute>} />
            <Route path="/inventaire/materiels" element={<ProtectedRoute requiredAccess="inventaire"><InventaireMateriels /></ProtectedRoute>} />
            <Route path="/inventaire/items/:id" element={<ProtectedRoute requiredAccess="inventaire"><InventaireItemDetail /></ProtectedRoute>} />
            <Route path="/inventaire/mouvements" element={<ProtectedRoute requiredAccess="inventaire"><InventaireMouvements /></ProtectedRoute>} />
            <Route path="/inventaire/achats" element={<ProtectedRoute requiredAccess="inventaire"><InventaireAchats /></ProtectedRoute>} />
            <Route path="/inventaire/achats/nouveau" element={<ProtectedRoute requiredAccess="inventaire"><AchatEditor /></ProtectedRoute>} />
            <Route path="/inventaire/achats/:id" element={<ProtectedRoute requiredAccess="inventaire"><AchatEditor /></ProtectedRoute>} />

            <Route path="/equipe" element={<ProtectedRoute requiredAccess="equipe"><Equipe /></ProtectedRoute>} />
            <Route path="/equipe/:id" element={<ProtectedRoute requiredAccess="equipe"><EmployeeDetail /></ProtectedRoute>} />
          <Route path="/timesheets" element={<ProtectedRoute requiredAccess="timesheets"><Timesheets /></ProtectedRoute>} />
          <Route path="/pointage/employes" element={<ProtectedRoute requiredAccess="timesheets"><Employes /></ProtectedRoute>} />
          <Route path="/pointage/employes/:id" element={<ProtectedRoute requiredAccess="timesheets"><EmployeePointageDetail /></ProtectedRoute>} />
          <Route path="/paiements" element={<ProtectedRoute requiredAccess="paiements"><Paiements /></ProtectedRoute>} />
          <Route path="/agenda" element={<ProtectedRoute requiredAccess="agenda"><Agenda /></ProtectedRoute>} />
          <Route path="/agenda/:id" element={<ProtectedRoute requiredAccess="agenda"><AgendaDetail /></ProtectedRoute>} />
          <Route path="/dashboard/ca" element={<ProtectedRoute requiredAccess="dashboard"><CADetail /></ProtectedRoute>} />
          <Route path="/profil" element={<Profil />} />
          <Route path="/notifications" element={<Notifications />} />
            <Route path="/parametres" element={<ProtectedRoute requiredAccess="parametres"><Parametres /></ProtectedRoute>} />
            <Route path="/support" element={<Support />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
};

export default App;
