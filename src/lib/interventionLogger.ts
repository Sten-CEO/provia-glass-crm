import { supabase } from "@/integrations/supabase/client";

export interface InterventionLogData {
  intervention_id: string;
  action: string;
  details?: string;
  user_name?: string;
}

/**
 * Enregistre un événement dans l'historique d'une intervention
 */
export async function logInterventionEvent(data: InterventionLogData) {
  try {
    const { error } = await supabase
      .from("intervention_logs")
      .insert({
        intervention_id: data.intervention_id,
        action: data.action,
        details: data.details || null,
        user_name: data.user_name || null,
      });

    if (error) {
      console.error("Erreur lors de l'enregistrement du log d'intervention:", error);
    }
  } catch (err) {
    console.error("Exception lors de l'enregistrement du log:", err);
  }
}

/**
 * Enregistre un changement de statut
 */
export async function logStatusChange(
  interventionId: string,
  oldStatus: string,
  newStatus: string,
  userName?: string
) {
  await logInterventionEvent({
    intervention_id: interventionId,
    action: "Changement de statut",
    details: `Statut modifié de "${oldStatus}" à "${newStatus}"`,
    user_name: userName,
  });
}

/**
 * Enregistre un événement de pointage
 */
export async function logTimesheetEvent(
  interventionId: string,
  employeeName: string,
  eventType: "start_day" | "stop_day" | "pause_start" | "pause_end",
  timestamp: Date,
  durationMinutes?: number
) {
  const timeStr = timestamp.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  let action = "Pointage";
  let details = "";

  switch (eventType) {
    case "start_day":
      action = "Pointage - Début";
      details = `Début de journée par ${employeeName} à ${timeStr}`;
      break;
    case "stop_day":
      action = "Pointage - Fin";
      details = `Fin de journée par ${employeeName} à ${timeStr}`;
      if (durationMinutes) {
        details += ` (durée totale: ${durationMinutes} min)`;
      }
      break;
    case "pause_start":
      action = "Pointage - Début pause";
      details = `Début de pause par ${employeeName} à ${timeStr}`;
      break;
    case "pause_end":
      action = "Pointage - Fin pause";
      details = `Fin de pause par ${employeeName} à ${timeStr}`;
      if (durationMinutes) {
        details += ` (durée: ${durationMinutes} min)`;
      }
      break;
  }

  await logInterventionEvent({
    intervention_id: interventionId,
    action,
    details,
    user_name: employeeName,
  });
}

/**
 * Enregistre une modification importante
 */
export async function logImportantChange(
  interventionId: string,
  changes: string[],
  userName?: string
) {
  if (changes.length === 0) return;

  await logInterventionEvent({
    intervention_id: interventionId,
    action: "Modification",
    details: changes.join(" "),
    user_name: userName,
  });
}

/**
 * Enregistre la création d'une intervention
 */
export async function logInterventionCreation(
  interventionId: string,
  title: string,
  status: string,
  userName?: string
) {
  await logInterventionEvent({
    intervention_id: interventionId,
    action: "Création",
    details: `Intervention "${title}" créée avec le statut "${status}"`,
    user_name: userName,
  });
}

/**
 * Enregistre la liaison avec une facture
 */
export async function logInvoiceLink(
  interventionId: string,
  invoiceNumber: string,
  userName?: string
) {
  await logInterventionEvent({
    intervention_id: interventionId,
    action: "Facturation",
    details: `Facture ${invoiceNumber} créée à partir de cette intervention`,
    user_name: userName,
  });
}
