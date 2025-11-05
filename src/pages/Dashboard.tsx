import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, FileText, Receipt, Users, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const stats = [
  { label: "Jobs du jour", value: "8", icon: Briefcase, color: "text-primary" },
  { label: "Devis en attente", value: "12", icon: FileText, color: "text-secondary" },
  { label: "Factures à encaisser", value: "€15,420", icon: Receipt, color: "text-primary" },
  { label: "Employés actifs", value: "24", icon: Users, color: "text-secondary" },
];

const recentActivity = [
  { type: "Devis envoyé", client: "Entreprise ABC", time: "Il y a 2h" },
  { type: "Facture payée", client: "Société XYZ", time: "Il y a 4h" },
  { type: "Job terminé", client: "Client Premium", time: "Il y a 6h" },
  { type: "Nouveau client", client: "Start-up Tech", time: "Hier" },
];

const alerts = [
  { text: "3 devis en retard", severity: "warning" },
  { text: "2 factures impayées", severity: "error" },
];

const Dashboard = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wide mb-2">
            Bienvenue, Entreprise
          </h1>
          <p className="text-muted-foreground">
            Vue d'ensemble de votre activité
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide shadow-lg hover:shadow-xl transition-all hover:scale-105">
              <Plus className="mr-2 h-4 w-4" />
              Créer
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-modal w-56">
            <DropdownMenuItem>Créer un client</DropdownMenuItem>
            <DropdownMenuItem>Créer un devis</DropdownMenuItem>
            <DropdownMenuItem>Créer un job</DropdownMenuItem>
            <DropdownMenuItem>Créer une facture</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`glass-card p-4 flex items-center gap-3 ${
                alert.severity === "error"
                  ? "border-l-4 border-destructive"
                  : "border-l-4 border-secondary"
              }`}
            >
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">{alert.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="glass-card p-6 hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
            <p className="text-3xl font-bold mb-2">{stat.value}</p>
            <p className="text-sm text-muted-foreground uppercase tracking-wide">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold uppercase tracking-wide mb-6">
          Activité récente
        </h2>
        <div className="space-y-4">
          {recentActivity.map((activity, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors"
            >
              <div>
                <p className="font-semibold">{activity.type}</p>
                <p className="text-sm text-muted-foreground">{activity.client}</p>
              </div>
              <span className="text-sm text-muted-foreground">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
