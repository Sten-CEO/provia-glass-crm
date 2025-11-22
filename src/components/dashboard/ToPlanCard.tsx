import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";

interface QuoteToPlan {
  id: string;
  numero: string;
  client_nom: string;
  total_ttc: number;
  planned_date?: string;
  statut: string;
}

export const ToPlanCard = () => {
  const [quotesToPlan, setQuotesToPlan] = useState<QuoteToPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { companyId } = useCurrentCompany();

  useEffect(() => {
    if (!companyId) return;

    loadQuotesToPlan();

    // Subscribe to changes
    const channel = supabase
      .channel("to-plan-quotes")
      .on("postgres_changes", { event: "*", schema: "public", table: "devis" }, loadQuotesToPlan)
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, loadQuotesToPlan)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  const loadQuotesToPlan = async () => {
    if (!companyId) return;

    try {
      // Get accepted/signed quotes
      const { data: quotes } = await supabase
        .from("devis")
        .select("id, numero, client_nom, total_ttc, planned_date, statut")
        .eq("company_id", companyId)
        .in("statut", ["Accepté", "Signé"])
        .order("created_at", { ascending: false });

      if (!quotes) {
        setQuotesToPlan([]);
        setLoading(false);
        return;
      }

      // Check which ones don't have an intervention yet
      const quotesWithoutJobs: QuoteToPlan[] = [];

      for (const quote of quotes) {
        const { data: job } = await supabase
          .from("jobs")
          .select("id")
          .eq("company_id", companyId)
          .eq("quote_id", quote.id)
          .maybeSingle();

        if (!job) {
          quotesWithoutJobs.push(quote);
        }
      }

      setQuotesToPlan(quotesWithoutJobs);
    } catch (error) {
      console.error("Error loading quotes to plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewQuotes = () => {
    navigate("/devis?filter=to-plan");
  };

  const handleCreateIntervention = (quoteId: string) => {
    navigate(`/interventions/nouvelle?quoteId=${quoteId}`);
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-warning" />
            À planifier
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  if (quotesToPlan.length === 0) {
    return null;
  }

  return (
    <Card className="glass-card border-l-4 border-l-warning">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-warning" />
          À planifier
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {quotesToPlan.length} devis en attente
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground mb-4">
          Ces devis ont été acceptés mais n'ont pas encore d'intervention planifiée
        </p>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {quotesToPlan.slice(0, 5).map((quote) => (
            <div
              key={quote.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{quote.numero}</p>
                <p className="text-sm text-muted-foreground truncate">{quote.client_nom}</p>
                {quote.planned_date && (
                  <p className="text-xs text-warning">
                    Prévu le {format(new Date(quote.planned_date), "dd MMM yyyy", { locale: fr })}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCreateIntervention(quote.id)}
                className="ml-2 shrink-0"
              >
                Planifier
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        {quotesToPlan.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{quotesToPlan.length - 5} autres devis
          </p>
        )}

        <Button
          variant="ghost"
          onClick={handleViewQuotes}
          className="w-full mt-4"
        >
          Voir tous les devis à planifier
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};
