import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Settings2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { RevenueModule } from "@/components/dashboard/RevenueModule";
import { AlertsColumn } from "@/components/dashboard/AlertsColumn";
import { AgendaColumn } from "@/components/dashboard/AgendaColumn";
import { AlertsConfigModal } from "@/components/dashboard/AlertsConfigModal";

const Dashboard = () => {
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header avec boutons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wide">Tableau de bord</h1>
          <p className="text-muted-foreground">Vue d'ensemble de votre activité</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAlertsModalOpen(true)}>
            <Settings2 className="h-4 w-4 mr-2" />
            Modifier les alertes
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard/ca')}>
            Vue précise CA
          </Button>
        </div>
      </div>

      {/* Module Chiffre d'Affaires */}
      <RevenueModule />

      {/* Layout 2 colonnes: Alertes à gauche, Agenda à droite */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertsColumn />
        <AgendaColumn />
      </div>

      {/* Modal de configuration des alertes */}
      <AlertsConfigModal open={alertsModalOpen} onOpenChange={setAlertsModalOpen} />
    </div>
  );
};

export default Dashboard;
