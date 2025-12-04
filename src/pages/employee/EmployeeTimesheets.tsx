import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Coffee } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useEmployee } from "@/contexts/EmployeeContext";

export const EmployeeTimesheets = () => {
  const { employeeId, companyId, loading: contextLoading } = useEmployee();
  const [isWorking, setIsWorking] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<any>(null);
  const [currentBreak, setCurrentBreak] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [breaks, setBreaks] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [breakTime, setBreakTime] = useState(0);

  useEffect(() => {
    if (!contextLoading && employeeId) {
      loadTimesheets();
    }
  }, [contextLoading, employeeId]);

  // Timer auto pour le temps de travail et les pauses
  useEffect(() => {
    let interval: any;
    if (currentEntry?.start_at && isWorking) {
      interval = setInterval(() => {
        const startDateTime = new Date(`${currentEntry.date}T${currentEntry.start_at}`);
        const now = Date.now();
        const totalSeconds = Math.floor((now - startDateTime.getTime()) / 1000);
        
        // Calculer temps de pause total
        let totalBreakSeconds = 0;
        const entryBreaks = breaks[currentEntry.id] || [];
        entryBreaks.forEach((b: any) => {
          if (b.end_at) {
            const start = new Date(`${currentEntry.date}T${b.start_at}`);
            const end = new Date(`${currentEntry.date}T${b.end_at}`);
            totalBreakSeconds += Math.floor((end.getTime() - start.getTime()) / 1000);
          }
        });
        
        // Pause en cours
        if (currentBreak?.start_at) {
          const breakStart = new Date(`${currentEntry.date}T${currentBreak.start_at}`);
          const breakElapsed = Math.floor((now - breakStart.getTime()) / 1000);
          setBreakTime(breakElapsed);
          totalBreakSeconds += breakElapsed;
        }
        
        setElapsedTime(totalSeconds - totalBreakSeconds);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentEntry, currentBreak, breaks, isWorking]);

  const loadTimesheets = async () => {
    if (!employeeId) return;

    try {
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
        
        // Load breaks for this entry
        const { data: breaksData } = await supabase
          .from("timesheet_breaks")
          .select("*")
          .eq("timesheet_entry_id", active.id)
          .order("created_at", { ascending: true });
        
        const breaksMap: Record<string, any[]> = {};
        if (breaksData) {
          breaksMap[active.id] = breaksData;
          
          // Check if there's an active break
          const activeBreak = breaksData.find((b: any) => !b.end_at);
          if (activeBreak) {
            setCurrentBreak(activeBreak);
            setOnBreak(true);
          }
        }
        setBreaks(breaksMap);
      }
    } catch (error: any) {
      toast.error("Erreur de chargement");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startWork = async () => {
    if (!employeeId || !companyId) return;

    try {
      const now = new Date();
      const { data, error } = await supabase
        .from("timesheets_entries")
        .insert({
          employee_id: employeeId,
          company_id: companyId,
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

  const startBreak = async () => {
    if (!currentEntry) return;

    try {
      const now = new Date();
      // Use currentEntry.company_id if available, otherwise fallback to companyId from context
      const breakCompanyId = currentEntry.company_id || companyId;

      // Debug logging
      console.log("=== DEBUG startBreak ===");
      console.log("currentEntry:", currentEntry);
      console.log("currentEntry.company_id:", currentEntry.company_id);
      console.log("companyId from context:", companyId);
      console.log("breakCompanyId:", breakCompanyId);

      if (!breakCompanyId) {
        toast.error("Erreur: company_id manquant");
        console.error("breakCompanyId is null or undefined");
        return;
      }

      const insertData = {
        timesheet_entry_id: currentEntry.id,
        start_at: format(now, "HH:mm:ss"),
        company_id: breakCompanyId,
      };
      console.log("Inserting with data:", insertData);

      const { data, error } = await supabase
        .from("timesheet_breaks")
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }

      console.log("Break created successfully:", data);
      setCurrentBreak(data);
      setOnBreak(true);
      toast.success("Pause démarrée");
      loadTimesheets();
    } catch (error: any) {
      console.error("=== FULL ERROR ===", error);
      toast.error(`Erreur lors du démarrage de la pause: ${error.message || "Erreur inconnue"}`);
    }
  };

  const endBreak = async () => {
    if (!currentBreak) return;

    try {
      const now = new Date();
      const { error } = await supabase
        .from("timesheet_breaks")
        .update({
          end_at: format(now, "HH:mm:ss"),
        })
        .eq("id", currentBreak.id);

      if (error) throw error;

      setCurrentBreak(null);
      setOnBreak(false);
      setBreakTime(0);
      toast.success("Pause terminée");
      loadTimesheets();
    } catch (error: any) {
      toast.error("Erreur lors de la fin de pause");
      console.error(error);
    }
  };

  const endWork = async () => {
    if (!currentEntry) return;

    // Si une pause est en cours, la terminer d'abord
    if (currentBreak) {
      await endBreak();
    }

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
      setElapsedTime(0);
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
                <p className="text-lg font-semibold">{onBreak ? "En pause" : "En cours"}</p>
              </div>
              
              <div className="space-y-2">
                <div className="text-2xl font-bold">{formatTime(elapsedTime)}</div>
                <p className="text-sm text-muted-foreground">Temps travaillé</p>
                {onBreak && (
                  <>
                    <div className="text-lg font-semibold text-orange-500">{formatTime(breakTime)}</div>
                    <p className="text-sm text-muted-foreground">Temps de pause</p>
                  </>
                )}
              </div>

              {currentEntry?.start_at && (
                <p className="text-muted-foreground">
                  Démarré à {currentEntry.start_at.substring(0, 5)}
                </p>
              )}

              <div className="space-y-2">
                {!onBreak ? (
                  <Button
                    onClick={startBreak}
                    size="lg"
                    variant="outline"
                    className="w-full"
                  >
                    <Coffee className="h-5 w-5 mr-2" />
                    Faire une pause
                  </Button>
                ) : (
                  <Button
                    onClick={endBreak}
                    size="lg"
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Fin de ma pause
                  </Button>
                )}

                <Button
                  onClick={endWork}
                  size="lg"
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  <Square className="h-5 w-5 mr-2" />
                  Terminer la journée
                </Button>
              </div>
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
