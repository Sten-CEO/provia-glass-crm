import { AlertsStrip } from "./AlertsStrip";
import { ToPlanCard } from "./ToPlanCard";
import { StockAlertsCard } from "./StockAlertsCard";
import { InvoicingAlertsCard } from "./InvoicingAlertsCard";
import { MaterialReservationsCard } from "./MaterialReservationsCard";

export const AlertsColumn = () => {
  return (
    <div className="space-y-6">
      <AlertsStrip />
      <ToPlanCard />
      <MaterialReservationsCard />
      <StockAlertsCard />
      <InvoicingAlertsCard />
    </div>
  );
};
