import { supabase } from "@/integrations/supabase/client";

/**
 * Met à jour automatiquement les événements d'agenda dont la date de fin est dépassée
 * Change leur statut à "terminé"
 */
export async function updateExpiredAgendaEvents() {
  try {
    const now = new Date().toISOString();

    // Récupérer les événements expirés qui ne sont pas encore terminés
    const { data: expiredEvents, error: fetchError } = await supabase
      .from('agenda_events')
      .select('id')
      .lt('end_at', now)
      .in('status', ['à venir', 'aujourd\'hui']);

    if (fetchError) {
      console.error('Erreur lors de la récupération des événements expirés:', fetchError);
      return { success: false, error: fetchError };
    }

    if (!expiredEvents || expiredEvents.length === 0) {
      return { success: true, updated: 0 };
    }

    // Mettre à jour tous les événements expirés
    const { error: updateError } = await supabase
      .from('agenda_events')
      .update({ status: 'terminé' })
      .in('id', expiredEvents.map(e => e.id));

    if (updateError) {
      console.error('Erreur lors de la mise à jour des statuts:', updateError);
      return { success: false, error: updateError };
    }

    console.log(`${expiredEvents.length} événement(s) d'agenda mis à jour automatiquement`);
    return { success: true, updated: expiredEvents.length };
  } catch (error) {
    console.error('Erreur inattendue:', error);
    return { success: false, error };
  }
}