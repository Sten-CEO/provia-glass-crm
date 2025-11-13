import { Card } from "@/components/ui/card";
import { AlertCircle, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export function InvoicingAlertsCard() {
  const [toInvoiceCount, setToInvoiceCount] = useState(0);
  const [awaitingPaymentCount, setAwaitingPaymentCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();

    const channel = supabase
      .channel("invoicing-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, loadStats)
      .on("postgres_changes", { event: "*", schema: "public", table: "factures" }, loadStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadStats = async () => {
    // Interventions terminées sans facture = À facturer
    const { data: jobsData } = await supabase
      .from("jobs")
      .select("id, factures:factures(id)")
      .eq("statut", "Terminée");

    const toInvoice = jobsData?.filter(
      (job: any) => !job.factures || job.factures.length === 0
    ).length || 0;

    // Factures envoyées mais non payées = En attente paiement
    const { data: invoicesData } = await supabase
      .from("factures")
      .select("id")
      .not("sent_at", "is", null)
      .is("paid_at", null);

    setToInvoiceCount(toInvoice);
    setAwaitingPaymentCount(invoicesData?.length || 0);
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
