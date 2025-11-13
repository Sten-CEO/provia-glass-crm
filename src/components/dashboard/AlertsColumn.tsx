import { AlertsStrip } from "./AlertsStrip";
import { ToPlanCard } from "./ToPlanCard";
import { StockAlertsCard } from "./StockAlertsCard";
import { InvoicingAlertsCard } from "./InvoicingAlertsCard";

export const AlertsColumn = () => {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold uppercase tracking-wide mb-6">Alertes</h2>
        <AlertsStrip />
      </div>
      
      <ToPlanCard />
      <StockAlertsCard />
      <InvoicingAlertsCard />
    </div>
  );
};
