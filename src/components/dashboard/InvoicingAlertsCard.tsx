import { Card } from "@/components/ui/card";
import { AlertCircle, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";

export function InvoicingAlertsCard() {
  const [toInvoiceCount, setToInvoiceCount] = useState(0);
  const [awaitingPaymentCount, setAwaitingPaymentCount] = useState(0);
  const navigate = useNavigate();
  const { companyId } = useCurrentCompany();

  useEffect(() => {
    if (!companyId) return;

    loadStats();

    const channel = supabase
      .channel("invoicing-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, loadStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "factures" }, loadStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  const loadStats = async () => {
    if (!companyId) return;

    // Interventions terminées sans facture liée = À facturer
    const { data: completedJobs } = await supabase
      .from("jobs")
      .select("id")
      .eq("company_id", companyId)
      .eq("statut", "Terminée");

    if (!completedJobs) {
      setToInvoiceCount(0);
      setAwaitingPaymentCount(0);
      return;
    }

    const jobIds = completedJobs.map(j => j.id);

    // Récupérer les factures liées à ces interventions
    const { data: linkedInvoices } = await supabase
      .from("factures")
      .select("id, intervention_id, sent_at, paid_at")
      .eq("company_id", companyId)
      .in("intervention_id", jobIds);

    // Interventions terminées sans facture = À facturer
    const linkedJobIds = new Set(linkedInvoices?.map(inv => inv.intervention_id) || []);
    const toInvoice = completedJobs.filter(job => !linkedJobIds.has(job.id)).length;

    // Factures envoyées mais non payées = En attente paiement
    const awaitingPayment = linkedInvoices?.filter(
      inv => inv.sent_at !== null && inv.paid_at === null
    ).length || 0;

    setToInvoiceCount(toInvoice);
    setAwaitingPaymentCount(awaitingPayment);
  };

  return (
    <Card className="glass-card p-6 hover:shadow-lg transition-all">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold uppercase tracking-wide text-sm">Alertes facturation</h3>
        <AlertCircle className="h-5 w-5 text-orange-500" />
      </div>

      <div className="space-y-4">
        <div
          className="flex items-center justify-between p-3 rounded-lg bg-orange-100/50 hover:bg-orange-100 transition-colors cursor-pointer"
          onClick={() => navigate("/interventions")}
        >
          <div>
            <p className="text-sm font-medium text-orange-900">À envoyer</p>
            <p className="text-xs text-orange-700">Interventions terminées</p>
          </div>
          <div className="text-2xl font-bold text-orange-900">{toInvoiceCount}</div>
        </div>

        <div
          className="flex items-center justify-between p-3 rounded-lg bg-blue-100/50 hover:bg-blue-100 transition-colors cursor-pointer"
          onClick={() => navigate("/factures")}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-700" />
            <div>
              <p className="text-sm font-medium text-blue-900">En attente de paiement</p>
              <p className="text-xs text-blue-700">Factures envoyées</p>
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-900">{awaitingPaymentCount}</div>
        </div>
      </div>
    </Card>
  );
}
