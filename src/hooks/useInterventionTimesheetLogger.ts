import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logTimesheetEvent } from "@/lib/interventionLogger";

/**
 * Hook qui écoute les événements de pointage et les enregistre automatiquement
 * dans l'historique de l'intervention
 */
export function useInterventionTimesheetLogger(interventionId: string | null) {
  useEffect(() => {
    if (!interventionId) return;

    // S'abonner aux événements de pointage pour cette intervention
    const channel = supabase
      .channel(`timesheet_logs_${interventionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "timesheets_events",
          filter: `job_id=eq.${interventionId}`,
        },
        async (payload) => {
          const event = payload.new;

          // Récupérer le nom de l'employé
          const { data: employee } = await supabase
            .from("equipe")
            .select("nom")
            .eq("id", event.employee_id)
            .single();

          if (employee && event.type && event.at) {
            await logTimesheetEvent(
              interventionId,
              employee.nom,
              event.type,
              new Date(event.at),
              event.duration_minutes || undefined
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [interventionId]);
}
