import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SubFunctionsDrawer } from "@/components/layout/SubFunctionsDrawer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Download, Check, X, Menu } from "lucide-react";
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
  hourly_rate?: number;
  cost: number;
  note?: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
}

interface Employee {
  id: string;
  nom: string;
  hourly_rate?: number;
}

interface Job {
  id: string;
  titre: string;
}

const subFunctions = [
  { label: "À approuver", path: "/timesheets?filter=submitted" },
  { label: "Brouillons", path: "/timesheets?filter=draft" },
  { label: "Approuvées", path: "/timesheets?filter=approved" },
  { label: "Export CSV", path: "/timesheets?action=export" },
  { label: "Rapport mensuel", path: "/timesheets?view=monthly" },
];

const Timesheets = () => {
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [subFunctionsOpen, setSubFunctionsOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({
    employee_id: "",
    job_id: "",
    date: format(new Date(), "yyyy-MM-dd"),
    start_at: "09:00",
    end_at: "17:00",
    break_min: 60,
    note: "",
  });

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("timesheets-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "timesheets_entries" }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    const [entriesRes, employeesRes, jobsRes] = await Promise.all([
      supabase.from("timesheets_entries").select("*").order("date", { ascending: false }),
      supabase.from("equipe").select("id, nom, hourly_rate"),
      supabase.from("jobs").select("id, titre"),
    ]);

    if (entriesRes.data) setEntries(entriesRes.data as unknown as TimesheetEntry[]);
    if (employeesRes.data) setEmployees(employeesRes.data as unknown as Employee[]);
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

    const hours = calculateHours();
    const employee = employees.find((e) => e.id === newEntry.employee_id);
    const hourly_rate = employee?.hourly_rate || 0;
    const cost = Math.round(hours * hourly_rate * 100) / 100;

    const { error } = await supabase.from("timesheets_entries").insert({
      employee_id: newEntry.employee_id,
      job_id: newEntry.job_id || null,
      date: newEntry.date,
      start_at: newEntry.start_at || null,
      end_at: newEntry.end_at || null,
      break_min: newEntry.break_min || 0,
      hours,
      hourly_rate,
      cost,
      note: newEntry.note || null,
      status: "draft",
    });

    if (error) {
      toast.error("Erreur", { description: error.message });
      return;
    }

    toast.success("Entrée créée");
    setModalOpen(false);
    setNewEntry({
      employee_id: "",
      job_id: "",
      date: format(new Date(), "yyyy-MM-dd"),
      start_at: "09:00",
      end_at: "17:00",
      break_min: 60,
      note: "",
    });
    loadData();
  };

  const handleSubmitWeek = async (employeeId: string) => {
    const weekEntries = entries.filter(
      (e) =>
        e.employee_id === employeeId &&
        e.status === "draft" &&
        parseISO(e.date) >= weekStart &&
        parseISO(e.date) <= weekEnd
    );

    if (weekEntries.length === 0) {
      toast.error("Aucune entrée en brouillon pour cette semaine");
      return;
    }

    const updates = weekEntries.map((e) =>
      supabase.from("timesheets_entries").update({ status: "submitted" }).eq("id", e.id)
    );

    await Promise.all(updates);
    toast.success("Semaine soumise");
    loadData();
  };

  const handleApproveWeek = async (employeeId: string) => {
    const weekEntries = entries.filter(
      (e) =>
        e.employee_id === employeeId &&
        e.status === "submitted" &&
        parseISO(e.date) >= weekStart &&
        parseISO(e.date) <= weekEnd
    );

    if (weekEntries.length === 0) {
      toast.error("Aucune entrée soumise pour cette semaine");
      return;
    }

    const updates = weekEntries.map((e) =>
      supabase.from("timesheets_entries").update({ status: "approved" }).eq("id", e.id)
    );

    await Promise.all(updates);
    toast.success("Semaine approuvée");
    loadData();
  };

  const handleRejectWeek = async (employeeId: string) => {
    const weekEntries = entries.filter(
      (e) =>
        e.employee_id === employeeId &&
        e.status === "submitted" &&
        parseISO(e.date) >= weekStart &&
        parseISO(e.date) <= weekEnd
    );

    if (weekEntries.length === 0) {
      toast.error("Aucune entrée soumise pour cette semaine");
      return;
    }

    const updates = weekEntries.map((e) =>
      supabase.from("timesheets_entries").update({ status: "rejected" }).eq("id", e.id)
    );

    await Promise.all(updates);
    toast.error("Semaine rejetée");
    loadData();
  };

  const exportCSV = () => {
    const filtered =
      selectedEmployee === "all" ? entries : entries.filter((e) => e.employee_id === selectedEmployee);

    const csv = [
      ["Date", "Employé", "Job", "Heures", "Taux", "Coût", "Statut", "Note"].join(","),
      ...filtered.map((e) => {
        const emp = employees.find((emp) => emp.id === e.employee_id);
        const job = jobs.find((j) => j.id === e.job_id);
        return [
          e.date,
          emp?.nom || "",
          job?.titre || "",
          e.hours,
          e.hourly_rate || 0,
          e.cost,
          e.status,
          (e.note || "").replace(/,/g, ";"),
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheets-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Export CSV réussi");
  };

  const filteredEntries =
    selectedEmployee === "all"
      ? entries.filter((e) => parseISO(e.date) >= weekStart && parseISO(e.date) <= weekEnd)
      : entries.filter(
          (e) => e.employee_id === selectedEmployee && parseISO(e.date) >= weekStart && parseISO(e.date) <= weekEnd
        );

  const getEmployeeWeekStats = (employeeId: string) => {
    const empEntries = entries.filter(
      (e) => e.employee_id === employeeId && parseISO(e.date) >= weekStart && parseISO(e.date) <= weekEnd
    );
    const totalHours = empEntries.reduce((sum, e) => sum + e.hours, 0);
    const totalCost = empEntries.reduce((sum, e) => sum + e.cost, 0);
    const hasSubmitted = empEntries.some((e) => e.status === "submitted");
    const allApproved = empEntries.length > 0 && empEntries.every((e) => e.status === "approved");
    return { totalHours, totalCost, hasSubmitted, allApproved, count: empEntries.length };
  };

  const getStatusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-500">Approuvée</Badge>;
    if (status === "submitted") return <Badge className="bg-blue-500">Soumise</Badge>;
    if (status === "rejected") return <Badge className="bg-red-500">Rejetée</Badge>;
    return <Badge variant="outline">Brouillon</Badge>;
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
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSubFunctionsOpen(true)}
              title="Sous-fonctions"
            >
              <Menu className="h-5 w-5" />
            </Button>
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

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div>
            <Label>Semaine</Label>
            <Input
              type="week"
              value={format(weekStart, "yyyy-'W'II")}
              onChange={(e) => {
                const [year, week] = e.target.value.split("-W");
                const date = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
                setSelectedWeek(date);
              }}
              className="mt-1"
            />
          </div>
          <div className="flex-1">
            <Label>Employé</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-2">
          {format(weekStart, "d MMM", { locale: fr })} → {format(weekEnd, "d MMM yyyy", { locale: fr })}
        </p>
      </div>

      {/* Per Employee */}
      {selectedEmployee === "all" ? (
        <div className="space-y-4">
          {employees.map((emp) => {
            const stats = getEmployeeWeekStats(emp.id);
            if (stats.count === 0) return null;

            return (
              <Card key={emp.id} className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{emp.nom}</CardTitle>
                    <div className="flex items-center gap-2">
                      {stats.allApproved && <Badge className="bg-green-500">Approuvée</Badge>}
                      {stats.hasSubmitted && !stats.allApproved && <Badge className="bg-blue-500">Soumise</Badge>}
                      {!stats.hasSubmitted && !stats.allApproved && <Badge variant="outline">Brouillon</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {stats.totalHours.toFixed(2)}h | {stats.totalCost.toFixed(2)}€
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4">
                    {!stats.allApproved && (
                      <Button size="sm" onClick={() => handleSubmitWeek(emp.id)} variant="outline">
                        Soumettre semaine
                      </Button>
                    )}
                    <Button size="sm" onClick={() => handleApproveWeek(emp.id)} className="gap-2">
                      <Check className="h-4 w-4" />
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleRejectWeek(emp.id)}
                      variant="destructive"
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Rejeter
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Date</th>
                          <th className="text-left py-2">Job</th>
                          <th className="text-right py-2">Heures</th>
                          <th className="text-right py-2">Coût</th>
                          <th className="text-center py-2">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries
                          .filter(
                            (e) =>
                              e.employee_id === emp.id &&
                              parseISO(e.date) >= weekStart &&
                              parseISO(e.date) <= weekEnd
                          )
                          .map((entry) => {
                            const job = jobs.find((j) => j.id === entry.job_id);
                            return (
                              <tr key={entry.id} className="border-b">
                                <td className="py-2">{format(parseISO(entry.date), "EEE d MMM", { locale: fr })}</td>
                                <td className="py-2">{job?.titre || "-"}</td>
                                <td className="text-right py-2">{entry.hours.toFixed(2)}h</td>
                                <td className="text-right py-2">{entry.cost.toFixed(2)}€</td>
                                <td className="text-center py-2">{getStatusBadge(entry.status)}</td>
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
      ) : (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>{employees.find((e) => e.id === selectedEmployee)?.nom || "Employé"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Job</th>
                    <th className="text-left py-2">Début</th>
                    <th className="text-left py-2">Fin</th>
                    <th className="text-right py-2">Pause</th>
                    <th className="text-right py-2">Heures</th>
                    <th className="text-right py-2">Taux</th>
                    <th className="text-right py-2">Coût</th>
                    <th className="text-center py-2">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => {
                    const job = jobs.find((j) => j.id === entry.job_id);
                    return (
                      <tr key={entry.id} className="border-b">
                        <td className="py-2">{format(parseISO(entry.date), "EEE d MMM", { locale: fr })}</td>
                        <td className="py-2">{job?.titre || "-"}</td>
                        <td className="py-2">{entry.start_at || "-"}</td>
                        <td className="py-2">{entry.end_at || "-"}</td>
                        <td className="text-right py-2">{entry.break_min || 0}min</td>
                        <td className="text-right py-2">{entry.hours.toFixed(2)}h</td>
                        <td className="text-right py-2">{entry.hourly_rate?.toFixed(2) || 0}€</td>
                        <td className="text-right py-2">{entry.cost.toFixed(2)}€</td>
                        <td className="text-center py-2">{getStatusBadge(entry.status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Entry Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nouvelle entrée</DialogTitle>
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
              <Select value={newEntry.job_id} onValueChange={(v) => setNewEntry({ ...newEntry, job_id: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Aucun</SelectItem>
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
              <Label>Heures calculées</Label>
              <p className="text-2xl font-bold mt-1">{calculateHours().toFixed(2)}h</p>
              {newEntry.employee_id && (
                <p className="text-sm text-muted-foreground">
                  Coût:{" "}
                  {(
                    calculateHours() * (employees.find((e) => e.id === newEntry.employee_id)?.hourly_rate || 0)
                  ).toFixed(2)}
                  €
                </p>
              )}
            </div>

            <div>
              <Label>Note</Label>
              <Textarea
                value={newEntry.note}
                onChange={(e) => setNewEntry({ ...newEntry, note: e.target.value })}
                placeholder="Notes optionnelles"
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddEntry}>Enregistrer</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SubFunctionsDrawer
        open={subFunctionsOpen}
        onOpenChange={setSubFunctionsOpen}
        title="Timesheets"
        subFunctions={subFunctions}
      />
    </div>
  );
};

export default Timesheets;
