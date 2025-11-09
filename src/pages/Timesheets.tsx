import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Download, Check, X, Clock, Send } from "lucide-react";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, addDays } from "date-fns";
import { fr } from "date-fns/locale";

interface TimesheetEntry {
  id: string;
  employee_id: string;
  job_id?: string;
  date: string;
  start_at?: string;
  end_at?: string;
  break_min?: number;
  hours: number;
  overtime_hours?: number;
  hourly_rate?: number;
  cost: number;
  note?: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  rejection_reason?: string;
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;
  created_at: string;
  updated_at: string;
}

interface Employee {
  id: string;
  nom: string;
  hourly_rate?: number;
  is_manager?: boolean;
}

interface Job {
  id: string;
  titre: string;
}

const Timesheets = () => {
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [newEntry, setNewEntry] = useState({
    employee_id: "",
    job_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    start_at: "09:00",
    end_at: "17:00",
    break_min: 60,
    hours: 0,
    note: "",
  });

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("timesheets-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "timesheets_entries" }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedWeek]);

  const loadData = async () => {
    const [entriesRes, employeesRes, jobsRes] = await Promise.all([
      supabase
        .from("timesheets_entries")
        .select("*")
        .gte("date", format(weekStart, "yyyy-MM-dd"))
        .lte("date", format(weekEnd, "yyyy-MM-dd"))
        .order("date", { ascending: true }),
      supabase.from("equipe").select("id, nom, hourly_rate, is_manager"),
      supabase.from("jobs").select("id, titre"),
    ]);

    if (entriesRes.data) setEntries(entriesRes.data as unknown as TimesheetEntry[]);
    if (employeesRes.data) {
      setEmployees(employeesRes.data as unknown as Employee[]);
      // Simuler l'utilisateur courant (premier employé pour démo)
      if (employeesRes.data.length > 0) {
        setCurrentUser(employeesRes.data[0] as unknown as Employee);
      }
    }
    if (jobsRes.data) setJobs(jobsRes.data as unknown as Job[]);
  };

  const calculateHours = () => {
    if (!newEntry.start_at || !newEntry.end_at) return 0;
    const [startH, startM] = newEntry.start_at.split(":").map(Number);
    const [endH, endM] = newEntry.end_at.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const totalMinutes = Math.max(0, endMinutes - startMinutes - (newEntry.break_min || 0));
    return Math.round((totalMinutes / 60) * 100) / 100;
  };

  const handleAddEntry = async () => {
    if (!newEntry.employee_id || !newEntry.date) {
      toast.error("Veuillez renseigner l'employé et la date");
      return;
    }

    const hours = newEntry.hours > 0 ? newEntry.hours : calculateHours();
    
    const { error } = await supabase.from("timesheets_entries").insert({
      employee_id: newEntry.employee_id,
      job_id: newEntry.job_id || null,
      date: newEntry.date,
      start_at: newEntry.start_at || null,
      end_at: newEntry.end_at || null,
      break_min: newEntry.break_min || 0,
      hours,
      note: newEntry.note || null,
      status: "draft",
    });

    if (error) {
      toast.error("Erreur", { description: error.message });
      return;
    }

    toast.success("Entrée créée avec succès");
    setModalOpen(false);
    setNewEntry({
      employee_id: "",
      job_id: "",
      date: format(new Date(), "yyyy-MM-dd"),
      start_at: "09:00",
      end_at: "17:00",
      break_min: 60,
      hours: 0,
      note: "",
    });
    loadData();
  };

  const handleBulkSubmit = async () => {
    if (selectedEntries.size === 0) {
      toast.error("Aucune entrée sélectionnée");
      return;
    }

    const { error } = await supabase
      .from("timesheets_entries")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .in("id", Array.from(selectedEntries))
      .eq("status", "draft");

    if (error) {
      toast.error("Erreur lors de la soumission");
      return;
    }

    toast.success(`${selectedEntries.size} entrée(s) soumise(s)`);
    setSelectedEntries(new Set());
    loadData();
  };

  const handleBulkApprove = async () => {
    if (!currentUser?.is_manager) {
      toast.error("Vous n'êtes pas autorisé à approuver");
      return;
    }

    if (selectedEntries.size === 0) {
      toast.error("Aucune entrée sélectionnée");
      return;
    }

    try {
      const { error } = await supabase.rpc("bulk_approve_timesheets", {
        entry_ids: Array.from(selectedEntries),
        manager_id: currentUser.id,
      });

      if (error) throw error;

      toast.success(`${selectedEntries.size} entrée(s) approuvée(s)`);
      setSelectedEntries(new Set());
      loadData();
    } catch (error: any) {
      toast.error("Erreur", { description: error.message });
    }
  };

  const handleBulkReject = async () => {
    if (!currentUser?.is_manager) {
      toast.error("Vous n'êtes pas autorisé à rejeter");
      return;
    }

    if (selectedEntries.size === 0) {
      toast.error("Aucune entrée sélectionnée");
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error("Veuillez indiquer une raison");
      return;
    }

    try {
      const { error } = await supabase.rpc("bulk_reject_timesheets", {
        entry_ids: Array.from(selectedEntries),
        manager_id: currentUser.id,
        reason: rejectionReason,
      });

      if (error) throw error;

      toast.success(`${selectedEntries.size} entrée(s) rejetée(s)`);
      setSelectedEntries(new Set());
      setRejectModalOpen(false);
      setRejectionReason("");
      loadData();
    } catch (error: any) {
      toast.error("Erreur", { description: error.message });
    }
  };

  const exportCSV = () => {
    const filtered =
      selectedEmployee === "all" ? entries : entries.filter((e) => e.employee_id === selectedEmployee);

    const csv = [
      ["Date", "Employé", "Job", "Heures", "H. Supp.", "Taux", "Coût", "Statut", "Note"].join(","),
      ...filtered.map((e) => {
        const emp = employees.find((emp) => emp.id === e.employee_id);
        const job = jobs.find((j) => j.id === e.job_id);
        return [
          e.date,
          emp?.nom || "",
          job?.titre || "",
          e.hours.toFixed(2),
          (e.overtime_hours || 0).toFixed(2),
          e.hourly_rate || 0,
          e.cost.toFixed(2),
          e.status,
          (e.note || "").replace(/,/g, ";"),
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheets-${format(weekStart, "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Export CSV réussi");
  };

  const getEmployeeWeekStats = (employeeId: string) => {
    const empEntries = entries.filter((e) => e.employee_id === employeeId);
    const regularHours = empEntries.reduce((sum, e) => sum + e.hours - (e.overtime_hours || 0), 0);
    const overtimeHours = empEntries.reduce((sum, e) => sum + (e.overtime_hours || 0), 0);
    const totalCost = empEntries.reduce((sum, e) => sum + e.cost, 0);
    const statusCounts = {
      draft: empEntries.filter((e) => e.status === "draft").length,
      submitted: empEntries.filter((e) => e.status === "submitted").length,
      approved: empEntries.filter((e) => e.status === "approved").length,
      rejected: empEntries.filter((e) => e.status === "rejected").length,
    };
    return { regularHours, overtimeHours, totalCost, statusCounts, count: empEntries.length };
  };

  const getStatusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-500">Approuvée</Badge>;
    if (status === "submitted") return <Badge className="bg-blue-500">Soumise</Badge>;
    if (status === "rejected") return <Badge className="bg-red-500">Rejetée</Badge>;
    return <Badge variant="outline">Brouillon</Badge>;
  };

  const toggleEntrySelection = (entryId: string) => {
    const newSelection = new Set(selectedEntries);
    if (newSelection.has(entryId)) {
      newSelection.delete(entryId);
    } else {
      newSelection.add(entryId);
    }
    setSelectedEntries(newSelection);
  };

  const toggleAllEmployeeEntries = (employeeId: string) => {
    const empEntries = entries.filter((e) => e.employee_id === employeeId);
    const allSelected = empEntries.every((e) => selectedEntries.has(e.id));
    
    const newSelection = new Set(selectedEntries);
    if (allSelected) {
      empEntries.forEach((e) => newSelection.delete(e.id));
    } else {
      empEntries.forEach((e) => newSelection.add(e.id));
    }
    setSelectedEntries(newSelection);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold uppercase tracking-wide">Timesheets</h1>
              <p className="text-muted-foreground">Pointage et validation hebdomadaire</p>
              {currentUser?.is_manager && (
                <Badge className="mt-2" variant="outline">
                  Manager
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={exportCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => setModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Pointer
            </Button>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-end gap-4">
          <div>
            <Label>Semaine</Label>
            <div className="flex items-center gap-2 mt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedWeek(addDays(selectedWeek, -7))}
              >
                ←
              </Button>
              <Input
                type="week"
                value={format(weekStart, "yyyy-'W'II")}
                onChange={(e) => {
                  const [year, week] = e.target.value.split("-W");
                  const date = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
                  setSelectedWeek(date);
                }}
                className="w-40"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedWeek(addDays(selectedWeek, 7))}
              >
                →
              </Button>
            </div>
          </div>
          <div className="flex-1">
            <Label>Employé</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les employés</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-4">
          {format(weekStart, "d MMM", { locale: fr })} → {format(weekEnd, "d MMM yyyy", { locale: fr })}
        </p>

        {/* Bulk Actions */}
        {selectedEntries.size > 0 && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">{selectedEntries.size} sélectionnée(s)</span>
            <Button size="sm" variant="outline" onClick={handleBulkSubmit} className="gap-2">
              <Send className="h-4 w-4" />
              Soumettre
            </Button>
            {currentUser?.is_manager && (
              <>
                <Button size="sm" onClick={handleBulkApprove} className="gap-2">
                  <Check className="h-4 w-4" />
                  Approuver
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setRejectModalOpen(true)}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Rejeter
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" onClick={() => setSelectedEntries(new Set())}>
              Annuler
            </Button>
          </div>
        )}
      </div>

      {/* Per Employee View */}
      <div className="space-y-4">
        {employees
          .filter((emp) => selectedEmployee === "all" || emp.id === selectedEmployee)
          .map((emp) => {
            const stats = getEmployeeWeekStats(emp.id);
            if (stats.count === 0) return null;

            const empEntries = entries.filter((e) => e.employee_id === emp.id);
            const allSelected = empEntries.every((e) => selectedEntries.has(e.id));

            return (
              <Card key={emp.id} className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={() => toggleAllEmployeeEntries(emp.id)}
                      />
                      <div>
                        <CardTitle>{emp.nom}</CardTitle>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span>
                            <Clock className="h-3 w-3 inline mr-1" />
                            {stats.regularHours.toFixed(2)}h
                          </span>
                          {stats.overtimeHours > 0 && (
                            <span className="text-orange-500">
                              +{stats.overtimeHours.toFixed(2)}h supp.
                            </span>
                          )}
                          <span className="font-medium">{stats.totalCost.toFixed(2)}€</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {stats.statusCounts.draft > 0 && (
                        <Badge variant="outline">{stats.statusCounts.draft} brouillon</Badge>
                      )}
                      {stats.statusCounts.submitted > 0 && (
                        <Badge className="bg-blue-500">{stats.statusCounts.submitted} soumise</Badge>
                      )}
                      {stats.statusCounts.approved > 0 && (
                        <Badge className="bg-green-500">{stats.statusCounts.approved} approuvée</Badge>
                      )}
                      {stats.statusCounts.rejected > 0 && (
                        <Badge className="bg-red-500">{stats.statusCounts.rejected} rejetée</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 w-8"></th>
                          <th className="text-left py-2">Date</th>
                          <th className="text-left py-2">Job</th>
                          <th className="text-left py-2">Horaires</th>
                          <th className="text-right py-2">Pause</th>
                          <th className="text-right py-2">Heures</th>
                          <th className="text-right py-2">H. Supp.</th>
                          <th className="text-right py-2">Taux</th>
                          <th className="text-right py-2">Coût</th>
                          <th className="text-center py-2">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empEntries.map((entry) => {
                          const job = jobs.find((j) => j.id === entry.job_id);
                          const isSelected = selectedEntries.has(entry.id);
                          return (
                            <tr
                              key={entry.id}
                              className={`border-b hover:bg-muted/50 ${isSelected ? "bg-muted" : ""}`}
                            >
                              <td className="py-2">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleEntrySelection(entry.id)}
                                />
                              </td>
                              <td className="py-2">
                                {format(parseISO(entry.date), "EEE d MMM", { locale: fr })}
                              </td>
                              <td className="py-2">{job?.titre || "-"}</td>
                              <td className="py-2">
                                {entry.start_at && entry.end_at
                                  ? `${entry.start_at} - ${entry.end_at}`
                                  : "-"}
                              </td>
                              <td className="text-right py-2">{entry.break_min || 0}min</td>
                              <td className="text-right py-2 font-medium">
                                {(entry.hours - (entry.overtime_hours || 0)).toFixed(2)}h
                              </td>
                              <td className="text-right py-2 text-orange-500 font-medium">
                                {entry.overtime_hours ? `+${entry.overtime_hours.toFixed(2)}h` : "-"}
                              </td>
                              <td className="text-right py-2">{entry.hourly_rate?.toFixed(2) || 0}€</td>
                              <td className="text-right py-2 font-medium">{entry.cost.toFixed(2)}€</td>
                              <td className="text-center py-2">
                                <div className="flex flex-col items-center gap-1">
                                  {getStatusBadge(entry.status)}
                                  {entry.rejection_reason && (
                                    <span className="text-xs text-red-500" title={entry.rejection_reason}>
                                      Raison
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* Add Entry Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle entrée de temps</DialogTitle>
            <DialogDescription>
              Saisir les heures travaillées. Les calculs se font automatiquement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Employé *</Label>
                <Select
                  value={newEntry.employee_id}
                  onValueChange={(v) => setNewEntry({ ...newEntry, employee_id: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={newEntry.date}
                  onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Job (optionnel)</Label>
              <Select value={newEntry.job_id || undefined} onValueChange={(v) => setNewEntry({ ...newEntry, job_id: v === "none" ? undefined : v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {jobs.map((j) => (
                    <SelectItem key={j.id} value={j.id}>
                      {j.titre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Heure début</Label>
                <Input
                  type="time"
                  value={newEntry.start_at}
                  onChange={(e) => setNewEntry({ ...newEntry, start_at: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Heure fin</Label>
                <Input
                  type="time"
                  value={newEntry.end_at}
                  onChange={(e) => setNewEntry({ ...newEntry, end_at: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Pause (min)</Label>
                <Input
                  type="number"
                  value={newEntry.break_min}
                  onChange={(e) => setNewEntry({ ...newEntry, break_min: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Ou saisir directement les heures</Label>
              <Input
                type="number"
                step="0.01"
                value={newEntry.hours}
                onChange={(e) => setNewEntry({ ...newEntry, hours: parseFloat(e.target.value) || 0 })}
                className="mt-1"
                placeholder="Laissez vide pour calcul auto"
              />
            </div>

            <div>
              <Label>Note</Label>
              <Textarea
                value={newEntry.note}
                onChange={(e) => setNewEntry({ ...newEntry, note: e.target.value })}
                className="mt-1"
                rows={2}
                placeholder="Informations complémentaires..."
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted rounded">
              <span className="text-sm">
                Heures calculées : <strong>{calculateHours().toFixed(2)}h</strong>
              </span>
              {calculateHours() > 8 && (
                <span className="text-sm text-orange-500">
                  (dont {(calculateHours() - 8).toFixed(2)}h supp.)
                </span>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddEntry}>Créer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeter les entrées</DialogTitle>
            <DialogDescription>
              Veuillez indiquer la raison du rejet pour informer l'employé.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Raison du rejet *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mt-1"
                rows={3}
                placeholder="Ex: Horaires incorrects, projet non valide..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleBulkReject}>
                Rejeter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Timesheets;