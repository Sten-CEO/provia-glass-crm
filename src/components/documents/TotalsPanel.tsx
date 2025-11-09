import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentTotals } from "@/types/documents";
import { formatCurrency } from "@/lib/documentCalculations";

interface TotalsPanelProps {
  totals: DocumentTotals;
  onGlobalDiscountChange?: (value: number) => void;
  onDepositChange?: (value: number) => void;
  disabled?: boolean;
  showDeposit?: boolean;
}

export function TotalsPanel({
  totals,
  onGlobalDiscountChange,
  onDepositChange,
  disabled,
  showDeposit = false,
}: TotalsPanelProps) {
  const remainingToPay = totals.totalTTC - (totals.depositAmount || 0);

  return (
    <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
      <div className="space-y-3">
        {onGlobalDiscountChange && (
          <div className="flex items-center justify-between">
            <Label htmlFor="globalDiscount" className="text-sm">
              Remise globale (%)
            </Label>
            <Input
              id="globalDiscount"
              type="number"
              value={totals.globalDiscountPct || 0}
              onChange={(e) => onGlobalDiscountChange(Number(e.target.value))}
              className="w-24 h-8 text-right"
              min="0"
              max="100"
              step="0.01"
              disabled={disabled}
            />
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span>Total HT</span>
          <span className="font-medium">{formatCurrency(totals.totalHT)}</span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span>Total TVA</span>
          <span className="font-medium">{formatCurrency(totals.totalVAT)}</span>
        </div>

        <div className="flex items-center justify-between text-lg font-bold border-t pt-2">
          <span>Total TTC</span>
          <span>{formatCurrency(totals.totalTTC)}</span>
        </div>

        {showDeposit && onDepositChange && (
          <>
            <div className="flex items-center justify-between border-t pt-2">
              <Label htmlFor="deposit" className="text-sm">
                Acompte (€)
              </Label>
              <Input
                id="deposit"
                type="number"
                value={totals.depositAmount || 0}
                onChange={(e) => onDepositChange(Number(e.target.value))}
                className="w-32 h-8 text-right"
                min="0"
                max={totals.totalTTC}
                step="0.01"
                disabled={disabled}
              />
            </div>

            <div className="flex items-center justify-between text-base font-semibold">
              <span>Reste à payer</span>
              <span>{formatCurrency(remainingToPay)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
