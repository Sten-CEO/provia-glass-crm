import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InterventionHistoryTabProps {
  interventionId: string;
}

interface Log {
  id: string;
  action: string;
  details: string | null;
  user_name: string | null;
  created_at: string;
}

export function InterventionHistoryTab({ interventionId }: InterventionHistoryTabProps) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();

    // Écoute des nouveaux logs en temps réel
    const channel = supabase
      .channel(`intervention_logs_${interventionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "intervention_logs",
          filter: `intervention_id=eq.${interventionId}`,
        },
        () => {
          loadLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [interventionId]);

  const loadLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("intervention_logs")
      .select("*")
      .eq("intervention_id", interventionId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  };

  const filteredLogs = logs.filter(log => {
    if (filter === "all") return true;
    return log.action.toLowerCase().includes(filter.toLowerCase());
  });

  const getActionBadgeVariant = (action: string) => {
    if (action.includes("Créée") || action.includes("créée")) return "default";
    if (action.includes("Modifiée") || action.includes("modifiée")) return "secondary";
    if (action.includes("Terminée") || action.includes("terminée")) return "default";
    if (action.includes("Annulée") || action.includes("annulée")) return "destructive";
    return "outline";
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Historique des actions</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les actions</SelectItem>
                <SelectItem value="création">Création</SelectItem>
                <SelectItem value="modification">Modification</SelectItem>
                <SelectItem value="statut">Changement statut</SelectItem>
                <SelectItem value="facturation">Facturation</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Aucun historique disponible</p>
              <p className="text-sm mt-2">Les actions seront enregistrées automatiquement</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-sm text-muted-foreground">{log.details}</p>
                    )}
                    {log.user_name && (
                      <p className="text-xs text-muted-foreground">Par {log.user_name}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
