import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logStatusChange } from "@/lib/interventionLogger";

/**
 * Hook qui surveille les changements de statut d'une intervention
 * et les enregistre automatiquement dans l'historique
 */
export function useInterventionStatusLogger(interventionId: string | null) {
  const previousStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!interventionId) return;

    // S'abonner aux changements de l'intervention
    const channel = supabase
      .channel(`intervention_status_${interventionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "jobs",
          filter: `id=eq.${interventionId}`,
        },
        async (payload) => {
          const oldJob = payload.old;
          const newJob = payload.new;

          // Vérifier si le statut a changé
          if (oldJob.statut !== newJob.statut) {
            // Récupérer le nom de l'utilisateur actuel si possible
            const { data: { user } } = await supabase.auth.getUser();
            let userName: string | undefined;

            if (user) {
              const { data: employee } = await supabase
                .from("equipe")
                .select("nom")
                .eq("user_id", user.id)
                .single();

              userName = employee?.nom;
            }

            // Enregistrer le changement de statut
            await logStatusChange(
              interventionId,
              oldJob.statut || "Non défini",
              newJob.statut || "Non défini",
              userName
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
