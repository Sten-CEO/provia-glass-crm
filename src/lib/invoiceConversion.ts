import { supabase } from "@/integrations/supabase/client";

interface Intervention {
  id: string;
  intervention_number?: string;
  client_id: string;
  client_nom: string;
  date: string;
  titre: string;
}

interface ConsumableItem {
  product_name: string;
  product_ref?: string;
  quantity: number;
  unit_price_ht: number;
  tax_rate: number;
  total_ht: number;
  total_ttc: number;
}

interface ServiceItem {
  description: string;
  quantity: number;
  unit_price_ht: number;
  tax_rate: number;
  total_ht: number;
  total_ttc: number;
}

export async function createInvoiceFromIntervention(interventionId: string) {
  // Load intervention data
  const { data: intervention, error: interventionError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", interventionId)
    .single();

  if (interventionError || !intervention) {
    throw new Error("Intervention non trouvée");
  }

  // Check if invoice already exists
  if (intervention.invoice_id) {
    throw new Error("Une facture existe déjà pour cette intervention");
  }

  // Load consumables
  const { data: consumables } = await supabase
    .from("intervention_consumables")
    .select("*")
    .eq("intervention_id", interventionId);

  // Load services
  const { data: services } = await supabase
    .from("intervention_services")
    .select("*")
    .eq("intervention_id", interventionId);

  // Build invoice lines from consumables and services
  const invoiceLines: any[] = [];

  // Add consumables as invoice lines
  (consumables || []).forEach((item: ConsumableItem) => {
    invoiceLines.push({
      type: "consumable",
      name: item.product_name,
      reference: item.product_ref || "",
      qty: item.quantity,
      unit_price_ht: item.unit_price_ht,
      tva_rate: item.tax_rate,
      unit: "unité",
      total_ht: item.total_ht,
      total_ttc: item.total_ttc,
    });
  });

  // Add services as invoice lines
  (services || []).forEach((item: ServiceItem) => {
    invoiceLines.push({
      type: "service",
      name: item.description,
      reference: "",
      qty: item.quantity,
      unit_price_ht: item.unit_price_ht,
      tva_rate: item.tax_rate,
      unit: "h",
      total_ht: item.total_ht,
      total_ttc: item.total_ttc,
    });
  });

  // Calculate totals
  const total_ht = invoiceLines.reduce((sum, line) => sum + (line.total_ht || 0), 0);
  const total_ttc = invoiceLines.reduce((sum, line) => sum + (line.total_ttc || 0), 0);

  // Generate invoice number
  const year = new Date().getFullYear();
  const { data: lastInvoice } = await supabase
    .from("factures")
    .select("numero")
    .order("created_at", { ascending: false })
    .limit(1);

  let invoiceNumber = `FAC-${year}-0001`;
  if (lastInvoice && lastInvoice[0]) {
    const lastNum = parseInt(lastInvoice[0].numero.split("-")[2]) || 0;
    invoiceNumber = `FAC-${year}-${String(lastNum + 1).padStart(4, "0")}`;
  }

  // Create invoice
  const { data: newInvoice, error: invoiceError } = await supabase
    .from("factures")
    .insert({
      numero: invoiceNumber,
      client_id: intervention.client_id,
      client_nom: intervention.client_nom,
      company_id: intervention.company_id,  // AJOUT : company_id pour RLS
      statut: "Brouillon",
      montant: String(total_ttc),
      total_ht,
      total_ttc,
      lignes: invoiceLines as any,
      issue_date: new Date().toISOString().split("T")[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      notes_legal: `Facture issue de l'intervention ${intervention.intervention_number || intervention.titre} du ${intervention.date}`,
    })
    .select()
    .single();

  if (invoiceError) {
    throw invoiceError;
  }

  // Link invoice to intervention
  await supabase
    .from("jobs")
    .update({ invoice_id: newInvoice.id })
    .eq("id", interventionId);

  return newInvoice;
}
