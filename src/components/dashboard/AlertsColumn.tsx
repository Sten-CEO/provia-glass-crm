import { AlertsStrip } from "./AlertsStrip";
import { ToPlanCard } from "./ToPlanCard";
import { StockAlertsCard } from "./StockAlertsCard";
import { InvoicingAlertsCard } from "./InvoicingAlertsCard";

export const AlertsColumn = () => {
  return (
    <div className="space-y-6">
      <AlertsStrip />
      <ToPlanCard />
      <StockAlertsCard />
      <InvoicingAlertsCard />
    </div>
  );
};
