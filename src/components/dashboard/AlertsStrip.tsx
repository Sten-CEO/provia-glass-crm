import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, FileText, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { eventBus, EVENTS } from "@/lib/eventBus";

interface AlertsData {
  unpaidInvoices: { count: number; total: number };
  overdueQuotes: number;
  upcomingDeadlines: number;
  quotesToSchedule: number;
  upcomingJobs7d: number;
  failedOrPostponed: number;
}

export const AlertsStrip = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<AlertsData>({
    unpaidInvoices: { count: 0, total: 0 },
    overdueQuotes: 0,
    upcomingDeadlines: 0,
    quotesToSchedule: 0,
    upcomingJobs7d: 0,
    failedOrPostponed: 0,
  });

  const loadAlerts = async () => {
    const today = new Date().toISOString().split("T")[0];
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // 1. Unpaid invoices
    const { data: unpaidInvoicesData } = await supabase
      .from("factures")
      .select("*")
      .neq("statut", "Payée")
      .or(`echeance.is.null,echeance.gte.${today}`);

    const unpaidTotal = unpaidInvoicesData?.reduce((sum, inv) => {
      return sum + (inv.total_ttc || parseFloat(String(inv.montant)) || 0);
    }, 0) || 0;

    // 2. Overdue quotes
    const { data: overdueQuotesData } = await supabase
      .from("devis")
      .select("*")
      .in("statut", ["Envoyé", "Brouillon"])
      .lt("expiry_date", today);

    // 3. Upcoming deadlines (invoices + planning)
    const { data: upcomingInvoicesData } = await supabase
      .from("factures")
      .select("*")
      .neq("statut", "Payée")
      .gte("echeance", today)
      .lte("echeance", in7Days);

    const { data: upcomingJobsScheduled } = await supabase
      .from("jobs")
      .select("id, scheduled_start")
      .gte("scheduled_start", today)
      .lte("scheduled_start", in7Days);

    const { data: upcomingJobsByDate } = await supabase
      .from("jobs")
      .select("id, date")
      .gte("date", today)
      .lte("date", in7Days);

    const upcomingJobs7d = (upcomingJobsByDate?.length || 0) || 0;

    const upcomingTotal = (upcomingInvoicesData?.length || 0) + ((upcomingJobsScheduled?.length || 0));

    // 4. Accepted quotes without linked intervention (To Schedule)
    const { data: acceptedQuotes } = await supabase
      .from("devis")
      .select("id")
      .in("statut", ["Accepté", "Signé"]);

    let quotesToSchedule = 0;
    if (acceptedQuotes && acceptedQuotes.length > 0) {
      const quoteIds = acceptedQuotes.map(q => q.id);
      const { data: linkedJobs } = await supabase
        .from("jobs")
        .select("quote_id")
        .in("quote_id", quoteIds)
        .not("statut", "eq", "Annulé");

      const linkedQuoteIds = new Set(linkedJobs?.map(j => j.quote_id) || []);
      quotesToSchedule = acceptedQuotes.filter(q => !linkedQuoteIds.has(q.id)).length;
    }

    // 5. Failed or Postponed interventions
    const { data: failedOrPostponedData } = await supabase
      .from("jobs")
      .select("id")
      .or(`statut.eq.Échouée,statut.eq.Reportée`);

    setAlerts({
      unpaidInvoices: { count: unpaidInvoicesData?.length || 0, total: unpaidTotal },
      overdueQuotes: overdueQuotesData?.length || 0,
      upcomingDeadlines: upcomingTotal,
      quotesToSchedule,
      upcomingJobs7d,
      failedOrPostponed: failedOrPostponedData?.length || 0,
    });
  };

  useEffect(() => {
    loadAlerts();

    // Subscribe to changes
    const channel = supabase
      .channel("alerts-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "factures" }, loadAlerts)
      .on("postgres_changes", { event: "*", schema: "public", table: "devis" }, loadAlerts)
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, loadAlerts)
      .subscribe();

    // Listen to event bus
    const handleDataChanged = (data: any) => {
      if (data?.scope === 'invoices' || data?.scope === 'quotes' || data?.scope === 'jobs' || data?.scope === 'planning') {
        loadAlerts();
      }
    };

    eventBus.on(EVENTS.DATA_CHANGED, handleDataChanged);

    return () => {
      supabase.removeChannel(channel);
      eventBus.off(EVENTS.DATA_CHANGED, handleDataChanged);
    };
  }, []);

  const alertChips = [
    {
      label: "Factures impayées",
      count: alerts.unpaidInvoices.count,
      detail: `€${alerts.unpaidInvoices.total.toFixed(2)}`,
      icon: AlertCircle,
      color: alerts.unpaidInvoices.count > 0 ? "amber" : "gray",
      onClick: () => navigate("/factures?filter=unpaid"),
    },
    {
      label: "Devis en retard",
      count: alerts.overdueQuotes,
      detail: null,
      icon: FileText,
      color: alerts.overdueQuotes > 0 ? "red" : "gray",
      onClick: () => navigate("/devis?filter=overdue"),
    },
    {
      label: "À planifier",
      count: alerts.quotesToSchedule,
      detail: "devis acceptés",
      icon: Calendar,
      color: alerts.quotesToSchedule > 0 ? "blue" : "gray",
      onClick: () => navigate("/devis?filter=to_schedule"),
    },
    {
      label: "Interventions (7j)",
      count: alerts.upcomingJobs7d,
      detail: null,
      icon: Calendar,
      color: alerts.upcomingJobs7d > 0 ? "blue" : "gray",
      onClick: () => navigate("/planning"),
    },
    {
      label: "Échéances proches (7j)",
      count: alerts.upcomingDeadlines,
      detail: null,
      icon: Calendar,
      color: alerts.upcomingDeadlines > 0 ? "blue" : "gray",
      onClick: () => {
        // Could open modal, for now navigate to planning
        navigate("/planning");
      },
    },
    {
      label: "Échouées / Reportées",
      count: alerts.failedOrPostponed,
      detail: null,
      icon: AlertCircle,
      color: alerts.failedOrPostponed > 0 ? "red" : "gray",
      onClick: () => navigate("/interventions?filter=failed_postponed"),
    },
  ];

  return (
    <div className="glass-card p-4 mb-6">
      <div className="flex items-center gap-4 flex-wrap">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Alertes</h2>
        <div className="flex items-center gap-3 flex-wrap">
          {alertChips.map((chip) => (
            <button
              key={chip.label}
              onClick={chip.onClick}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium",
                "border backdrop-blur-[8px] transition-all shadow-[0_2px_8px_rgba(0,0,0,.06)]",
                "hover:translate-y-[0.5px] hover:border-current/45 cursor-pointer",
                chip.color === "amber" && "text-[#F59E0B] border-[#F59E0B]/30 bg-[rgba(245,158,11,0.08)]",
                chip.color === "red" && "text-[#EF4444] border-[#EF4444]/30 bg-[rgba(239,68,68,0.08)]",
                chip.color === "blue" && "text-[#3B82F6] border-[#3B82F6]/30 bg-[rgba(59,130,246,0.08)]",
                chip.color === "gray" && "text-[#6B7280] border-[#6B7280]/30 bg-[rgba(107,114,128,0.08)]"
              )}
            >
              <chip.icon className="h-4 w-4" />
              <span>
                {chip.count} {chip.label}
              </span>
              {chip.detail && <span className="font-bold">· {chip.detail}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
