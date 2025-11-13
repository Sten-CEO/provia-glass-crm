import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AlertsConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AlertsConfigModal = ({ open, onOpenChange }: AlertsConfigModalProps) => {
  const [config, setConfig] = useState({
    invoices_to_send: true,
    overdue_invoices: true,
    quotes_unanswered: true,
    jobs_today: true,
    low_stock: true,
    timesheet_alerts: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open]);

  const loadConfig = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('dashboard_prefs' as any)
      .select('alerts_enabled')
      .eq('user_id', user.id)
      .single();

    if ((data as any)?.alerts_enabled) {
      setConfig((data as any).alerts_enabled);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('dashboard_prefs' as any)
      .upsert({
        user_id: user.id,
        alerts_enabled: config,
      } as any, {
        onConflict: 'user_id'
      });

    if (error) {
      toast.error("Erreur lors de l'enregistrement");
    } else {
      toast.success("Préférences enregistrées");
      onOpenChange(false);
    }
    setLoading(false);
  };

  const alertLabels = {
    invoices_to_send: "Factures à envoyer",
    overdue_invoices: "Factures en retard",
    quotes_unanswered: "Devis sans réponse",
    jobs_today: "Interventions du jour",
    low_stock: "Stock faible",
    timesheet_alerts: "Alertes pointage",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier les alertes</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {Object.entries(alertLabels).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label htmlFor={key} className="cursor-pointer">
                {label}
              </Label>
              <Switch
                id={key}
                checked={config[key as keyof typeof config]}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, [key]: checked }))
                }
              />
            </div>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            Enregistrer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
