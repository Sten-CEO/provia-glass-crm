import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTaxes } from "@/hooks/useTaxes";
interface ServicesSectionProps {
  interventionId: string | undefined;
}
export function ServicesSection({
  interventionId
}: ServicesSectionProps) {
  const [lines, setLines] = useState<any[]>([]);
  const [serviceItems, setServiceItems] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const taxesQuery = useTaxes();
  const taxes = taxesQuery.data || [];
  useEffect(() => {
    loadData();
    if (interventionId) {
      loadLines();
    }
  }, [interventionId]);
  const loadData = async () => {
    const [servicesRes, empRes] = await Promise.all([supabase.from("service_items").select("*").eq("is_active", true).order("name"), supabase.from("equipe").select("id, nom, hourly_rate")]);
    if (servicesRes.data) setServiceItems(servicesRes.data);
    if (empRes.data) setEmployees(empRes.data);
  };
  const loadLines = async () => {
    if (!interventionId) return;
    const {
      data
    } = await supabase.from("intervention_services").select("*").eq("intervention_id", interventionId);
    if (data) setLines(data);
  };
  const addLine = async () => {
    if (!interventionId) {
      toast.error("Veuillez d'abord enregistrer l'intervention");
      return;
    }
    const newLine = {
      intervention_id: interventionId,
      description: "",
      quantity: 1,
      unit: "h",
      unit_price_ht: 0,
      tax_rate: 20,
      is_billable: true
    };
    const {
      data,
      error
    } = await supabase.from("intervention_services").insert([newLine]).select().single();
    if (error) {
      toast.error("Erreur lors de l'ajout");
      return;
    }
    setLines([...lines, data]);
  };
  const updateLine = async (lineId: string, field: string, value: any) => {
    const {
      error
    } = await supabase.from("intervention_services").update({
      [field]: value
    }).eq("id", lineId);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }
    setLines(lines.map(l => l.id === lineId ? {
      ...l,
      [field]: value
    } : l));
  };
  const selectServiceItem = async (lineId: string, serviceId: string) => {
    const service = serviceItems.find(s => s.id === serviceId);
    if (!service) return;
    const updates = {
      service_item_id: serviceId,
      description: service.name,
      unit: service.unit || "h",
      unit_price_ht: service.default_price_ht || 0,
      tax_rate: service.default_tva_rate || 20
    };
    const {
      error
    } = await supabase.from("intervention_services").update(updates).eq("id", lineId);
    if (error) {
      toast.error("Erreur lors de la sélection");
      return;
    }
    loadLines();
  };
  const deleteLine = async (lineId: string) => {
    const {
      error
    } = await supabase.from("intervention_services").delete().eq("id", lineId);
    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }
    setLines(lines.filter(l => l.id !== lineId));
  };
  const totals = lines.reduce((acc, line) => {
    const ht = line.quantity * line.unit_price_ht;
    const ttc = ht * (1 + line.tax_rate / 100);
    return {
      totalHT: acc.totalHT + ht,
      totalTTC: acc.totalTTC + ttc
    };
  }, {
    totalHT: 0,
    totalTTC: 0
  });
  return <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Services / Prestations effectuées</CardTitle>
          <Button onClick={addLine} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {lines.length === 0 ? <p className="text-center text-muted-foreground py-8">
            Aucun service ajouté. Cliquez sur "Ajouter" pour commencer.
          </p> : <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Qté</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead>PU HT</TableHead>
                  <TableHead>TVA %</TableHead>
                  <TableHead>Total HT</TableHead>
                  <TableHead>Total TTC</TableHead>
                  <TableHead>Affecté à</TableHead>
                  <TableHead>Facturable</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map(line => <TableRow key={line.id}>
                    <TableCell>
                      <Select value={line.service_item_id || "none"} onValueChange={v => v !== "none" && selectServiceItem(line.id, v)}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="none">Sélectionner un service</SelectItem>
                          {serviceItems.map(service => <SelectItem key={service.id} value={service.id}>
                              <div className="flex items-center gap-2">
                                <span>{service.name}</span>
                                {service.category && <span className="text-xs text-muted-foreground">• {service.category}</span>}
                                <span className="text-xs text-muted-foreground">
                                  {service.default_price_ht}€ HT
                                </span>
                              </div>
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input value={line.description || ""} onChange={e => updateLine(line.id, "description", e.target.value)} className="w-[200px]" />
                    </TableCell>
                    <TableCell>
                      <Input type="number" step="0.25" value={line.quantity} onChange={e => updateLine(line.id, "quantity", parseFloat(e.target.value))} className="w-16" />
                    </TableCell>
                    <TableCell>
                      <Select value={line.unit} onValueChange={v => updateLine(line.id, "unit", v)}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="h">h</SelectItem>
                          <SelectItem value="j">j</SelectItem>
                          <SelectItem value="m²">m²</SelectItem>
                          <SelectItem value="m">m</SelectItem>
                          <SelectItem value="unité">unité</SelectItem>
                          <SelectItem value="forfait">forfait</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="number" value={line.unit_price_ht} onChange={e => updateLine(line.id, "unit_price_ht", parseFloat(e.target.value))} className="w-24" />
                    </TableCell>
                    <TableCell>
                      <Select value={line.tax_rate?.toString()} onValueChange={v => updateLine(line.id, "tax_rate", parseFloat(v))}>
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {taxes.map(tax => <SelectItem key={tax.rate} value={tax.rate.toString()}>
                              {tax.rate}%
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{(line.quantity * line.unit_price_ht).toFixed(2)} €</TableCell>
                    <TableCell>
                      {(line.quantity * line.unit_price_ht * (1 + line.tax_rate / 100)).toFixed(2)} €
                    </TableCell>
                    <TableCell>
                      <Select value={line.assigned_to || "none"} onValueChange={v => updateLine(line.id, "assigned_to", v === "none" ? null : v)}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Aucun" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun</SelectItem>
                          {employees.map(emp => <SelectItem key={emp.id} value={emp.id}>
                              {emp.nom}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Checkbox checked={line.is_billable} onCheckedChange={checked => updateLine(line.id, "is_billable", checked)} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteLine(line.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>

            
          </>}
      </CardContent>
    </Card>;
}