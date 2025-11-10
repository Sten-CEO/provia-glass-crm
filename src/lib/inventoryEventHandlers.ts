import { eventBus, EVENTS } from "./eventBus";
import { 
  createPlannedOut, 
  convertPlannedToOut, 
  cancelPlannedMovements, 
  reschedulePlannedMovements 
} from "./inventoryMovementService";
import { supabase } from "@/integrations/supabase/client";

/**
 * Initialize all inventory event handlers
 */
export function initializeInventoryEventHandlers() {
  // Quote accepted: create planned movements
  eventBus.on(EVENTS.QUOTE_ACCEPTED, async (data: { quoteId: string; quoteNumber: string; scheduledDate?: string }) => {
    try {
      const { data: quote } = await supabase
        .from("devis")
        .select("lignes, expires_at")
        .eq("id", data.quoteId)
        .single();

      if (!quote || !quote.lignes) return;

      const lines = Array.isArray(quote.lignes) ? quote.lignes : [];
      const scheduledDate = data.scheduledDate || quote.expires_at || new Date().toISOString();

      for (const line of lines) {
        const typedLine = line as any;
        if (typedLine.inventory_item_id && typedLine.qty > 0) {
          await createPlannedOut({
            itemId: typedLine.inventory_item_id,
            qty: typedLine.qty,
            sourceType: "devis",
            sourceId: data.quoteId,
            sourceNumber: data.quoteNumber,
            scheduledAt: scheduledDate,
            note: `Sortie planifiée pour devis ${data.quoteNumber}`,
          });
        }
      }
    } catch (error) {
      console.error("Error handling QUOTE_ACCEPTED:", error);
    }
  });

  // Quote canceled: cancel planned movements
  eventBus.on(EVENTS.QUOTE_CANCELED, async (data: { quoteId: string }) => {
    try {
      await cancelPlannedMovements(data.quoteId, "devis");
    } catch (error) {
      console.error("Error handling QUOTE_CANCELED:", error);
    }
  });

  // Job scheduled: create/update planned movements
  eventBus.on(EVENTS.JOB_SCHEDULED, async (data: { jobId: string; jobTitle: string; scheduledDate: string }) => {
    try {
      // Get linked quote items if any
      const { data: job } = await supabase
        .from("jobs")
        .select("linked_quote_id")
        .eq("id", data.jobId)
        .single();

      if (job?.linked_quote_id) {
        const { data: quote } = await supabase
          .from("devis")
          .select("lignes, numero")
          .eq("id", job.linked_quote_id)
          .single();

        if (quote && quote.lignes) {
          const lines = Array.isArray(quote.lignes) ? quote.lignes : [];
          
          for (const line of lines) {
            const typedLine = line as any;
            if (typedLine.inventory_item_id && typedLine.qty > 0) {
              await createPlannedOut({
                itemId: typedLine.inventory_item_id,
                qty: typedLine.qty,
                sourceType: "intervention",
                sourceId: data.jobId,
                sourceNumber: data.jobTitle,
                scheduledAt: data.scheduledDate,
                note: `Sortie planifiée pour intervention ${data.jobTitle}`,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error handling JOB_SCHEDULED:", error);
    }
  });

  // Job rescheduled: update planned movements dates
  eventBus.on(EVENTS.JOB_RESCHEDULED, async (data: { jobId: string; newScheduledDate: string }) => {
    try {
      await reschedulePlannedMovements(data.jobId, "intervention", data.newScheduledDate);
    } catch (error) {
      console.error("Error handling JOB_RESCHEDULED:", error);
    }
  });

  // Job completed: convert planned to actual outputs
  eventBus.on(EVENTS.JOB_COMPLETED, async (data: { jobId: string }) => {
    try {
      await convertPlannedToOut(data.jobId, "intervention");
    } catch (error) {
      console.error("Error handling JOB_COMPLETED:", error);
    }
  });

  // Job canceled: cancel planned movements
  eventBus.on(EVENTS.JOB_CANCELED, async (data: { jobId: string }) => {
    try {
      await cancelPlannedMovements(data.jobId, "intervention");
    } catch (error) {
      console.error("Error handling JOB_CANCELED:", error);
    }
  });

  // Purchase received is handled directly in the purchase module
  // but we listen to it for potential side effects
  eventBus.on(EVENTS.PURCHASE_RECEIVED, async (data: { purchaseId: string; items: any[] }) => {
    // This event is mainly for notifications/logging
    // The actual inventory update is done by the purchase module
    console.log("Purchase received:", data.purchaseId);
  });
}
