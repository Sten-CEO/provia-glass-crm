import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, FileText, Receipt, Users, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { RevenueModule } from "@/components/dashboard/RevenueModule";

const Dashboard = () => {
  const [stats, setStats] = useState({
    jobsCount: 0,
    devisCount: 0,
    facturesTotal: "€0",
    facturesCount: 0,
    employesCount: 0,
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
    loadActivity();

    // Subscribe to changes
    const jobsChannel = supabase.channel("dashboard-jobs").on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, loadStats).subscribe();
    const devisChannel = supabase.channel("dashboard-devis").on("postgres_changes", { event: "*", schema: "public", table: "devis" }, loadStats).subscribe();
    const facturesChannel = supabase.channel("dashboard-factures").on("postgres_changes", { event: "*", schema: "public", table: "factures" }, loadStats).subscribe();
    const equipeChannel = supabase.channel("dashboard-equipe").on("postgres_changes", { event: "*", schema: "public", table: "equipe" }, loadStats).subscribe();

    return () => {
      supabase.removeChannel(jobsChannel);
      supabase.removeChannel(devisChannel);
      supabase.removeChannel(facturesChannel);
      supabase.removeChannel(equipeChannel);
    };
  }, []);

  const loadStats = async () => {
    const today = new Date().toISOString().split("T")[0];

    const { data: jobsData } = await supabase.from("jobs").select("*").eq("date", today);
    const { data: devisData } = await supabase.from("devis").select("*").eq("statut", "Envoyé");
    
    // Factures à encaisser: envoye, en_retard, brouillon with due_date >= today
    const { data: facturesData } = await supabase
      .from("factures")
      .select("*")
      .in("statut", ["Envoyé", "En retard", "Brouillon"])
      .gte("echeance", today);
    
    const { data: employesData } = await supabase.from("equipe").select("*");

    const facturesTotal = facturesData?.reduce((sum, f) => {
      const amount = f.total_ttc || parseFloat(String(f.montant)) || 0;
      return sum + (typeof amount === 'number' ? amount : parseFloat(String(amount)));
    }, 0) || 0;

    setStats({
      jobsCount: jobsData?.length || 0,
      devisCount: devisData?.length || 0,
      facturesTotal: `€${facturesTotal.toFixed(2)}`,
      facturesCount: facturesData?.length || 0,
      employesCount: employesData?.length || 0,
    });
  };

  const loadActivity = async () => {
    const { data: devisData } = await supabase.from("devis").select("*").order("created_at", { ascending: false }).limit(2);
    const { data: facturesData } = await supabase.from("factures").select("*").order("created_at", { ascending: false }).limit(2);

    const activities = [
      ...(devisData || []).map((d) => ({ type: "Devis envoyé", client: d.client_nom, time: "Récemment" })),
      ...(facturesData || []).map((f) => ({ type: f.statut === "Payée" ? "Facture payée" : "Facture créée", client: f.client_nom, time: "Récemment" })),
    ].slice(0, 4);

    setRecentActivity(activities);
  };

  const statsDisplay = [
    { label: "Jobs du jour", value: stats.jobsCount.toString(), icon: Briefcase, color: "text-primary" },
    { label: "Devis en attente", value: stats.devisCount.toString(), icon: FileText, color: "text-secondary" },
    { label: "Factures à encaisser", value: `${stats.facturesCount} · ${stats.facturesTotal}`, icon: Receipt, color: "text-primary" },
    { label: "Employés actifs", value: stats.employesCount.toString(), icon: Users, color: "text-secondary" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <RevenueModule />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wide mb-2">Bienvenue, Entreprise</h1>
          <p className="text-muted-foreground">Vue d'ensemble de votre activité</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide shadow-lg hover:shadow-xl transition-all hover:scale-105">
              <Plus className="mr-2 h-4 w-4" />
              Créer
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-modal w-56">
            <DropdownMenuItem onClick={() => navigate("/clients")}>Créer un client</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/devis")}>Créer un devis</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/jobs")}>Créer un job</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/factures")}>Créer une facture</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsDisplay.map((stat, idx) => (
          <div key={idx} className="glass-card p-6 hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
            </div>
            <p className="text-3xl font-bold mb-2">{stat.value}</p>
            <p className="text-sm text-muted-foreground uppercase tracking-wide">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold uppercase tracking-wide mb-6">Activité récente</h2>
        <div className="space-y-4">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/30 transition-colors">
                <div>
                  <p className="font-semibold">{activity.type}</p>
                  <p className="text-sm text-muted-foreground">{activity.client}</p>
                </div>
                <span className="text-sm text-muted-foreground">{activity.time}</span>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-center py-8">Aucune activité récente</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
