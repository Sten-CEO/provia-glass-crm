import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useEmployee } from "@/contexts/EmployeeContext";

export const EmployeeTimesheets = () => {
  const { employeeId, loading: contextLoading } = useEmployee();
  const [isWorking, setIsWorking] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contextLoading && employeeId) {
      loadTimesheets();
    }
  }, [contextLoading, employeeId]);

  const loadTimesheets = async () => {
    if (!employeeId) return;

    try {
      // Load today's entries
      const today = format(new Date(), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("timesheets_entries")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("date", today)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setEntries(data || []);
      
      // Check if there's an active entry
      const active = data?.find((e: any) => e.status === "draft" && e.end_at === null);
      if (active) {
        setCurrentEntry(active);
        setIsWorking(true);
      }
    } catch (error: any) {
      toast.error("Erreur de chargement");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const startWork = async () => {
    if (!employeeId) return;

    try {
      const now = new Date();
      const { data, error } = await supabase
        .from("timesheets_entries")
        .insert({
          employee_id: employeeId,
          date: format(now, "yyyy-MM-dd"),
          start_at: format(now, "HH:mm:ss"),
          timesheet_type: "day",
          status: "draft",
          hours: 0
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentEntry(data);
      setIsWorking(true);
      toast.success("Pointage démarré");
      loadTimesheets();
    } catch (error: any) {
      toast.error("Erreur de pointage");
      console.error(error);
    }
  };

  const endWork = async () => {
    if (!currentEntry) return;

    try {
      const now = new Date();
      const { error } = await supabase
        .from("timesheets_entries")
        .update({
          end_at: format(now, "HH:mm:ss"),
          status: "submitted",
        })
        .eq("id", currentEntry.id);

      if (error) throw error;

      setCurrentEntry(null);
      setIsWorking(false);
      toast.success("Pointage terminé");
      loadTimesheets();
    } catch (error: any) {
      toast.error("Erreur de pointage");
      console.error(error);
    }
  };

  if (loading || contextLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h2 className="text-xl font-semibold mb-4">Pointage</h2>

      <Card className="p-6">
        <div className="text-center space-y-4">
          {!isWorking ? (
            <>
              <p className="text-muted-foreground">Aucun pointage en cours</p>
              <Button
                onClick={startWork}
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Play className="h-5 w-5 mr-2" />
                Démarrer la journée
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2">
                <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                <p className="text-lg font-semibold">En cours</p>
              </div>
              {currentEntry?.start_at && (
                <p className="text-muted-foreground">
                  Démarré à {currentEntry.start_at.substring(0, 5)}
                </p>
              )}
              <Button
                onClick={endWork}
                size="lg"
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <Square className="h-5 w-5 mr-2" />
                Terminer la journée
              </Button>
            </>
          )}
        </div>
      </Card>

      {entries.length > 0 && (
        <Card className="p-6">
          <h3 className="font-semibold mb-3">Aujourd'hui</h3>
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {entry.start_at?.substring(0, 5)} - {entry.end_at?.substring(0, 5) || "En cours"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {entry.hours ? `${entry.hours}h` : "Calcul en cours..."}
                  </p>
                </div>
                <Badge variant={entry.status === "draft" ? "secondary" : "default"}>
                  {entry.status === "draft" ? "En cours" : "Terminé"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
