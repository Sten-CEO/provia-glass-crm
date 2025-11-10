import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface InvoiceSectionProps {
  intervention: any;
}

export function InvoiceSection({ intervention }: InvoiceSectionProps) {
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    if (intervention.invoice_id) {
      loadInvoice();
    }
  }, [intervention.invoice_id]);

  const loadInvoice = async () => {
    if (!intervention.invoice_id) return;
    
    const { data } = await supabase
      .from("factures")
      .select("*")
      .eq("id", intervention.invoice_id)
      .single();
    
    if (data) setInvoice(data);
  };

  const handleCreateInvoice = () => {
    navigate(`/factures/nouvelle?intervention=${intervention.id}`);
  };

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle>Facturation liée</CardTitle>
      </CardHeader>
      <CardContent>
        {invoice ? (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{invoice.numero}</p>
                  <p className="text-sm text-muted-foreground">
                    {invoice.client_nom}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{invoice.total_ttc} €</p>
                  <p className="text-sm text-muted-foreground">TTC</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-2">
                <span className="text-sm">Statut:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  invoice.statut === "Payée" ? "bg-green-100 text-green-800" :
                  invoice.statut === "En attente" ? "bg-yellow-100 text-yellow-800" :
                  "bg-red-100 text-red-800"
                }`}>
                  {invoice.statut}
                </span>
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={() => navigate(`/factures/${invoice.id}`)}
              className="w-full"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Voir la facture
            </Button>
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Cette intervention n'est pas encore facturée
            </p>
            {intervention.statut === "Terminée" && (
              <Button onClick={handleCreateInvoice}>
                <FileText className="h-4 w-4 mr-2" />
                Créer une facture à partir de cette intervention
              </Button>
            )}
            {intervention.statut !== "Terminée" && (
              <p className="text-sm text-muted-foreground">
                Marquez l'intervention comme terminée pour créer une facture
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
