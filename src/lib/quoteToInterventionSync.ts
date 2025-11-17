import { supabase } from "@/integrations/supabase/client";

/**
 * Copy consumables from quote to intervention after creation
 */
export async function syncQuoteConsumablesToIntervention(
  quoteId: string,
  interventionId: string
) {
  try {
    // Check if consumables already exist for this intervention
    const { data: existingConsumables } = await supabase
      .from("intervention_consumables")
      .select("id")
      .eq("intervention_id", interventionId)
      .limit(1);

    // If consumables already exist, don't duplicate
    if (existingConsumables && existingConsumables.length > 0) {
      console.log("Consumables already exist for this intervention, skipping sync");
      return { consumablesCount: 0, servicesCount: 0 };
    }

    // Get all consumable/material lines from the quote
    const { data: quote, error: quoteError } = await supabase
      .from("devis")
      .select("lignes")
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      throw new Error("Quote not found");
    }

    const lines = (quote.lignes as any[]) || [];
    const consumableLines = lines.filter(
      (line) =>
        line.type === "consumable" ||
        line.type === "material" ||
        line.inventory_item_id
    );

    // Create intervention consumables
    const consumablesToCreate = consumableLines.map((line) => ({
      intervention_id: interventionId,
      inventory_item_id: line.inventory_item_id || null,
      product_name: line.name || line.designation || "",
      product_ref: line.reference || "",
      quantity: line.qty || line.quantite || 1,
      unit: line.unit || line.unite || "unité",
      unit_price_ht: line.unit_price_ht || line.prix_unitaire || 0,
      tax_rate: line.tva_rate || line.taux_tva || 20,
      total_ht: (line.qty || 1) * (line.unit_price_ht || 0),
      total_ttc:
        (line.qty || 1) * (line.unit_price_ht || 0) * (1 + (line.tva_rate || 20) / 100),
      serial_number: line.serial_number || null,
      location: line.location || null,
    }));

    if (consumablesToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from("intervention_consumables")
        .insert(consumablesToCreate);

      if (insertError) {
        throw insertError;
      }
    }

    // Get service lines from the quote
    const serviceLines = lines.filter(
      (line) =>
        line.type === "service" || (!line.type && !line.inventory_item_id)
    );

    // Create intervention services
    const servicesToCreate = serviceLines.map((line) => ({
      intervention_id: interventionId,
      description: line.name || line.designation || "",
      quantity: line.qty || line.quantite || 1,
      unit: line.unit || line.unite || "h",
      unit_price_ht: line.unit_price_ht || line.prix_unitaire || 0,
      tax_rate: line.tva_rate || line.taux_tva || 20,
      total_ht: (line.qty || 1) * (line.unit_price_ht || 0),
      total_ttc:
        (line.qty || 1) * (line.unit_price_ht || 0) * (1 + (line.tva_rate || 20) / 100),
      is_billable: true,
      assigned_to: null,
    }));

    if (servicesToCreate.length > 0) {
      const { error: serviceError } = await supabase
        .from("intervention_services")
        .insert(servicesToCreate);

      if (serviceError) {
        throw serviceError;
      }
    }

    return {
      consumablesCount: consumablesToCreate.length,
      servicesCount: servicesToCreate.length,
    };
  } catch (error) {
    console.error("Error syncing quote consumables:", error);
    throw error;
  }
}
