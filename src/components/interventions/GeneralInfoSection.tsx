import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientPicker } from "@/components/documents/ClientPicker";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAllStatuses, getAvailableTransitions, INTERVENTION_STATUSES, type InterventionStatus } from "@/lib/interventionStatuses";

interface GeneralInfoSectionProps {
  intervention: any;
  onChange: (intervention: any) => void;
}

export function GeneralInfoSection({ intervention, onChange }: GeneralInfoSectionProps) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [empRes, quotesRes, contractsRes] = await Promise.all([
      supabase.from("equipe").select("id, nom"),
      supabase.from("devis").select("id, numero, client_nom").order("created_at", { ascending: false }).limit(50),
      supabase.from("contracts").select("id, contract_number, title").order("created_at", { ascending: false }).limit(50),
    ]);

    if (empRes.data) setEmployees(empRes.data);
    if (quotesRes.data) setQuotes(quotesRes.data);
    if (contractsRes.data) setContracts(contractsRes.data);
  };

  const updateField = (field: string, value: any) => {
    onChange({ ...intervention, [field]: value });
  };

  return (
    <div className="grid gap-6">
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Numéro d'intervention</Label>
              <Input value={intervention.intervention_number || ""} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={intervention.statut} onValueChange={(v) => updateField("statut", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getAllStatuses().map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Titre / Objet de l'intervention *</Label>
            <Input 
              value={intervention.titre || ""} 
              onChange={(e) => updateField("titre", e.target.value)}
              placeholder="Ex: Maintenance préventive climatisation"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <ClientPicker
                value={intervention.client_id}
                onChange={(clientId, client) => {
                  onChange({
                    ...intervention,
                    client_id: clientId,
                    client_nom: client?.nom || "",
                  });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Type d'intervention</Label>
              <Select value={intervention.type || "Maintenance"} onValueChange={(v) => updateField("type", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Installation">Installation</SelectItem>
                  <SelectItem value="Dépannage">Dépannage</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Adresse du chantier</Label>
            <Input 
              value={intervention.adresse || ""} 
              onChange={(e) => updateField("adresse", e.target.value)}
              placeholder="Adresse complète du site"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date prévue</Label>
              <Input 
                type="date"
                value={intervention.date || ""} 
                onChange={(e) => updateField("date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Heure début</Label>
              <Input 
                type="time"
                value={intervention.heure_debut || ""} 
                onChange={(e) => updateField("heure_debut", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Heure fin</Label>
              <Input 
                type="time"
                value={intervention.heure_fin || ""} 
                onChange={(e) => updateField("heure_fin", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Technicien principal</Label>
              <Select 
                value={intervention.employe_id || "none"} 
                onValueChange={(v) => {
                  if (v === "none") {
                    onChange({ ...intervention, employe_id: null, employe_nom: "", assigned_employee_ids: [] });
                  } else {
                    const emp = employees.find(e => e.id === v);
                    onChange({
                      ...intervention,
                      employe_id: v,
                      employe_nom: emp?.nom || "",
                      assigned_employee_ids: [v],
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select value={intervention.priority || "normale"} onValueChange={(v) => updateField("priority", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basse">Basse</SelectItem>
                  <SelectItem value="normale">Normale</SelectItem>
                  <SelectItem value="haute">Haute</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rattachement au devis</Label>
              <Select value={intervention.quote_id || "none"} onValueChange={(v) => updateField("quote_id", v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {quotes.map((q) => (
                    <SelectItem key={q.id} value={q.id}>{q.numero} - {q.client_nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rattachement au contrat</Label>
              <Select value={intervention.contract_id || "none"} onValueChange={(v) => updateField("contract_id", v === "none" ? null : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.contract_number} - {c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description / Objectif de la mission</Label>
            <Textarea 
              value={intervention.description || ""} 
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Détails de l'intervention..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
