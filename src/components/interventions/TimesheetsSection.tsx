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

interface TimesheetsSectionProps {
  interventionId: string | undefined;
}

export function TimesheetsSection({ interventionId }: TimesheetsSectionProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    loadEmployees();
    if (interventionId) {
      loadEntries();
    }
  }, [interventionId]);

  const loadEmployees = async () => {
    const { data } = await supabase
      .from("equipe")
      .select("id, nom, hourly_rate")
      .order("nom");
    if (data) setEmployees(data);
  };

  const loadEntries = async () => {
    if (!interventionId) return;
    const { data } = await supabase
      .from("timesheets_entries")
      .select("*, equipe:employee_id(nom)")
      .eq("job_id", interventionId)
      .order("date");
    if (data) setEntries(data);
  };

  const addEntry = async () => {
    if (!interventionId) {
      toast.error("Veuillez d'abord enregistrer l'intervention");
      return;
    }

    const newEntry = {
      job_id: interventionId,
      employee_id: employees[0]?.id || null,
      date: new Date().toISOString().split("T")[0],
      start_at: "08:00",
      end_at: "17:00",
      break_min: 60,
      is_billable: true,
      status: "draft" as "draft",
    };

    const { data, error } = await supabase
      .from("timesheets_entries")
      .insert([newEntry])
      .select("*, equipe:employee_id(nom)")
      .single();

    if (error) {
      toast.error("Erreur lors de l'ajout");
      return;
    }

    setEntries([...entries, data]);
  };

  const updateEntry = async (entryId: string, field: string, value: any) => {
    const { error } = await supabase
      .from("timesheets_entries")
      .update({ [field]: value })
      .eq("id", entryId);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }

    loadEntries();
  };

  const deleteEntry = async (entryId: string) => {
    const { error } = await supabase
      .from("timesheets_entries")
      .delete()
      .eq("id", entryId);

    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }

    setEntries(entries.filter(e => e.id !== entryId));
  };

  const calculateDuration = (start: string, end: string, breakMin: number) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);
    const totalMin = (endH * 60 + endM) - (startH * 60 + startM) - breakMin;
    return Math.max(0, totalMin / 60);
  };

  const totals = entries.reduce((acc, entry) => {
    const hours = entry.hours || 0;
    const amount = entry.cost || 0;
    return {
      totalHours: acc.totalHours + hours,
      totalAmount: acc.totalAmount + amount,
    };
  }, { totalHours: 0, totalAmount: 0 });

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Temps passé</CardTitle>
          <Button onClick={addEntry} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Aucun temps enregistré. Cliquez sur "Ajouter" pour commencer.
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Technicien</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Début</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Pause (min)</TableHead>
                  <TableHead>Durée (h)</TableHead>
                  <TableHead>Taux horaire</TableHead>
                  <TableHead>Montant €</TableHead>
                  <TableHead>Facturable</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const duration = calculateDuration(entry.start_at, entry.end_at, entry.break_min || 0);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Select 
                          value={entry.employee_id || ""} 
                          onValueChange={(v) => updateEntry(entry.id, "employee_id", v)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.nom}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="date"
                          value={entry.date || ""} 
                          onChange={(e) => updateEntry(entry.id, "date", e.target.value)}
                          className="w-36"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="time"
                          value={entry.start_at || ""} 
                          onChange={(e) => updateEntry(entry.id, "start_at", e.target.value)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="time"
                          value={entry.end_at || ""} 
                          onChange={(e) => updateEntry(entry.id, "end_at", e.target.value)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          type="number"
                          value={entry.break_min || 0} 
                          onChange={(e) => updateEntry(entry.id, "break_min", parseInt(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>{(entry.hours || duration).toFixed(2)}</TableCell>
                      <TableCell>
                        <Input 
                          type="number"
                          value={entry.hourly_rate || 0} 
                          onChange={(e) => updateEntry(entry.id, "hourly_rate", parseFloat(e.target.value))}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>{(entry.cost || 0).toFixed(2)} €</TableCell>
                      <TableCell>
                        <Checkbox 
                          checked={entry.is_billable} 
                          onCheckedChange={(checked) => updateEntry(entry.id, "is_billable", checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteEntry(entry.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="mt-4 flex justify-end gap-8 text-sm font-medium">
              <div>Total heures: {totals.totalHours.toFixed(2)} h</div>
              <div>Total montant: {totals.totalAmount.toFixed(2)} €</div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
