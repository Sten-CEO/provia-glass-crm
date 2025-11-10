import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Download, Check, X, Send, Settings2, Edit, Trash2, Filter } from "lucide-react";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkDeleteToolbar } from "@/components/common/BulkDeleteToolbar";
import { DisplayOptionsPanel } from "@/components/common/DisplayOptionsPanel";
import { useDisplaySettings } from "@/hooks/useDisplaySettings";
import { TimesheetEntryModal } from "@/components/timesheets/TimesheetEntryModal";

interface TimesheetEntry {
  id: string;
  employee_id: string;
  client_id?: string;
  job_id?: string;
  date: string;
  start_at?: string;
  end_at?: string;
  break_min?: number;
  travel_minutes?: number;
  hours: number;
  overtime_hours?: number;
  hourly_rate?: number;
  cost: number;
  is_billable: boolean;
  billing_status: "non_facturé" | "facturé" | "en_attente";
  invoice_id?: string;
  description?: string;
  note?: string;
  status: "draft" | "submitted" | "approved" | "rejected";
  rejection_reason?: string;
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;
  created_at: string;
  updated_at: string;
}

interface Client {
  id: string;
  nom: string;
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
  client_id?: string;
}

const Timesheets = () => {
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedBillingStatus, setSelectedBillingStatus] = useState<string>("all");
  const [startDate, setStartDate] = useState(format(addDays(new Date(), -30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimesheetEntry | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [displayPanelOpen, setDisplayPanelOpen] = useState(false);

  const {
    selectedIds,
    selectedCount,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    allSelected,
  } = useBulkSelection<TimesheetEntry>(entries);

  const availableColumns = [
    { key: "date", label: "Date" },
    { key: "employee", label: "Employé" },
    { key: "client", label: "Client" },
    { key: "job", label: "Intervention" },
    { key: "start_end", label: "Horaires" },
    { key: "hours", label: "Heures" },
    { key: "overtime", label: "H. Supp." },
    { key: "break", label: "Pause" },
    { key: "travel", label: "Trajet" },
    { key: "rate", label: "Taux" },
    { key: "cost", label: "Coût" },
    { key: "is_billable", label: "Facturable" },
    { key: "billing_status", label: "État facturation" },
    { key: "description", label: "Description" },
    { key: "status", label: "Statut" },
  ];

  const {
    settings,
    loading: settingsLoading,
    toggleColumn,
    saveView,
    deleteView,
    applyView,
  } = useDisplaySettings("timesheets", availableColumns.map(c => c.key));

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("timesheets-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "timesheets_entries" }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [startDate, endDate]);

  const loadData = async () => {
    const [entriesRes, employeesRes, clientsRes, jobsRes] = await Promise.all([
      supabase
        .from("timesheets_entries")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false }),
      supabase.from("equipe").select("id, nom, hourly_rate, is_manager"),
      supabase.from("clients").select("id, nom"),
      supabase.from("jobs").select("id, titre, client_id"),
    ]);

    if (entriesRes.data) setEntries(entriesRes.data as unknown as TimesheetEntry[]);
    if (employeesRes.data) {
      setEmployees(employeesRes.data as unknown as Employee[]);
      if (employeesRes.data.length > 0) {
        setCurrentUser(employeesRes.data[0] as unknown as Employee);
      }
    }
    if (clientsRes.data) setClients(clientsRes.data as unknown as Client[]);
    if (jobsRes.data) setJobs(jobsRes.data as unknown as Job[]);
  };

  const handleBulkSubmit = async () => {
    if (selectedCount === 0) {
      toast.error("Aucune entrée sélectionnée");
      return;
    }

    const { error } = await supabase
      .from("timesheets_entries")
      .update({ status: "submitted", submitted_at: new Date().toISOString() })
      .in("id", selectedIds)
      .eq("status", "draft");

    if (error) {
      toast.error("Erreur lors de la soumission");
      return;
    }

    toast.success(`${selectedCount} entrée(s) soumise(s)`);
    clearSelection();
    loadData();
  };

  const handleBulkApprove = async () => {
    if (!currentUser?.is_manager) {
      toast.error("Vous n'êtes pas autorisé à approuver");
      return;
    }

    if (selectedCount === 0) {
      toast.error("Aucune entrée sélectionnée");
      return;
    }

    try {
      const { error } = await supabase.rpc("bulk_approve_timesheets", {
        entry_ids: selectedIds,
        manager_id: currentUser.id,
      });

      if (error) throw error;

      toast.success(`${selectedCount} entrée(s) approuvée(s)`);
      clearSelection();
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

    if (selectedCount === 0) {
      toast.error("Aucune entrée sélectionnée");
      return;
    }

    if (!rejectionReason.trim()) {
      toast.error("Veuillez indiquer une raison");
      return;
    }

    try {
      const { error } = await supabase.rpc("bulk_reject_timesheets", {
        entry_ids: selectedIds,
        manager_id: currentUser.id,
        reason: rejectionReason,
      });

      if (error) throw error;

      toast.success(`${selectedCount} entrée(s) rejetée(s)`);
      clearSelection();
      setRejectModalOpen(false);
      setRejectionReason("");
      loadData();
    } catch (error: any) {
      toast.error("Erreur", { description: error.message });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;

    const { error } = await supabase
      .from("timesheets_entries")
      .delete()
      .in("id", selectedIds);

    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }

    toast.success(`${selectedCount} entrée(s) supprimée(s)`);
    clearSelection();
    loadData();
  };

  const exportCSV = () => {
    const filtered = getFilteredEntries();

    const csv = [
      [
        "Date",
        "Employé",
        "Client",
        "Intervention",
        "Heures",
        "H. Supp.",
        "Pause",
        "Trajet",
        "Taux",
        "Coût",
        "Facturable",
        "État facturation",
        "Statut",
        "Description",
      ].join(","),
      ...filtered.map((e) => {
        const emp = employees.find((emp) => emp.id === e.employee_id);
        const client = clients.find((c) => c.id === e.client_id);
        const job = jobs.find((j) => j.id === e.job_id);
        return [
          e.date,
          emp?.nom || "",
          client?.nom || "",
          job?.titre || "",
          e.hours.toFixed(2),
          (e.overtime_hours || 0).toFixed(2),
          e.break_min || 0,
          e.travel_minutes || 0,
          e.hourly_rate || 0,
          e.cost.toFixed(2),
          e.is_billable ? "Oui" : "Non",
          e.billing_status,
          e.status,
          (e.description || "").replace(/,/g, ";"),
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timesheets-${startDate}-${endDate}.csv`;
    a.click();
    toast.success("Export CSV réussi");
  };

  const getFilteredEntries = () => {
    return entries.filter((e) => {
      if (selectedEmployee !== "all" && e.employee_id !== selectedEmployee) return false;
      if (selectedClient !== "all" && e.client_id !== selectedClient) return false;
      if (selectedStatus !== "all" && e.status !== selectedStatus) return false;
      if (selectedBillingStatus !== "all" && e.billing_status !== selectedBillingStatus) return false;
      return true;
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === "approved") return <Badge className="bg-green-500">Approuvée</Badge>;
    if (status === "submitted") return <Badge className="bg-blue-500">Soumise</Badge>;
    if (status === "rejected") return <Badge className="bg-red-500">Rejetée</Badge>;
    return <Badge variant="outline">Brouillon</Badge>;
  };

  const getBillingStatusBadge = (status: string) => {
    if (status === "facturé") return <Badge className="bg-green-500">Facturé</Badge>;
    if (status === "en_attente") return <Badge className="bg-orange-500">En attente</Badge>;
    return <Badge variant="outline">Non facturé</Badge>;
  };

  const isColumnVisible = (key: string) => {
    if (settingsLoading) return true;
    return settings.visibleColumns.includes(key);
  };

  const filteredEntries = getFilteredEntries();
  const totalHours = filteredEntries.reduce((sum, e) => sum + e.hours, 0);
  const totalCost = filteredEntries.reduce((sum, e) => sum + e.cost, 0);
  const billableHours = filteredEntries.filter((e) => e.is_billable).reduce((sum, e) => sum + e.hours, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-wide">Feuilles de temps</h1>
            <p className="text-muted-foreground">Suivi et gestion du temps de travail</p>
            {currentUser?.is_manager && (
              <Badge className="mt-2" variant="outline">
                Manager
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setDisplayPanelOpen(true)} variant="outline" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Options
            </Button>
            <Button onClick={exportCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={() => { setEditingEntry(null); setModalOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle entrée
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
          <div>
            <Label>Date début</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Date fin</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Employé</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
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
          <div>
            <Label>Client</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Statut</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="submitted">Soumis</SelectItem>
                <SelectItem value="approved">Approuvé</SelectItem>
                <SelectItem value="rejected">Rejeté</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Facturation</Label>
            <Select value={selectedBillingStatus} onValueChange={setSelectedBillingStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="non_facturé">Non facturé</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="facturé">Facturé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 p-4 bg-muted rounded-lg">
          <div>
            <div className="text-2xl font-bold">{filteredEntries.length}</div>
            <div className="text-sm text-muted-foreground">Entrées</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
            <div className="text-sm text-muted-foreground">Total heures</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{billableHours.toFixed(1)}h</div>
            <div className="text-sm text-muted-foreground">Facturables</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{totalCost.toFixed(2)}€</div>
            <div className="text-sm text-muted-foreground">Coût total</div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedCount > 0 && (
        <div className="glass-card p-4">
          <BulkDeleteToolbar
            selectedCount={selectedCount}
            totalCount={filteredEntries.length}
            onSelectAll={toggleAll}
            onDelete={handleBulkDelete}
            entityName="entrée"
            allSelected={allSelected}
          />
          <div className="flex items-center gap-2 mt-4">
            <Button size="sm" variant="outline" onClick={handleBulkSubmit} className="gap-2">
              <Send className="h-4 w-4" />
              Soumettre ({selectedCount})
            </Button>
            {currentUser?.is_manager && (
              <>
                <Button size="sm" onClick={handleBulkApprove} className="gap-2">
                  <Check className="h-4 w-4" />
                  Approuver ({selectedCount})
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setRejectModalOpen(true)}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Rejeter ({selectedCount})
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              {isColumnVisible("date") && <TableHead>Date</TableHead>}
              {isColumnVisible("employee") && <TableHead>Employé</TableHead>}
              {isColumnVisible("client") && <TableHead>Client</TableHead>}
              {isColumnVisible("job") && <TableHead>Intervention</TableHead>}
              {isColumnVisible("start_end") && <TableHead>Horaires</TableHead>}
              {isColumnVisible("hours") && <TableHead>Heures</TableHead>}
              {isColumnVisible("overtime") && <TableHead>H. Supp.</TableHead>}
              {isColumnVisible("break") && <TableHead>Pause</TableHead>}
              {isColumnVisible("travel") && <TableHead>Trajet</TableHead>}
              {isColumnVisible("rate") && <TableHead>Taux/h</TableHead>}
              {isColumnVisible("cost") && <TableHead>Coût</TableHead>}
              {isColumnVisible("is_billable") && <TableHead>Facturable</TableHead>}
              {isColumnVisible("billing_status") && <TableHead>État fact.</TableHead>}
              {isColumnVisible("description") && <TableHead>Description</TableHead>}
              {isColumnVisible("status") && <TableHead>Statut</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.map((entry) => {
              const emp = employees.find((e) => e.id === entry.employee_id);
              const client = clients.find((c) => c.id === entry.client_id);
              const job = jobs.find((j) => j.id === entry.job_id);

              return (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected(entry.id)}
                      onCheckedChange={() => toggleItem(entry.id)}
                    />
                  </TableCell>
                  {isColumnVisible("date") && (
                    <TableCell>{format(new Date(entry.date), "dd/MM/yyyy", { locale: fr })}</TableCell>
                  )}
                  {isColumnVisible("employee") && <TableCell>{emp?.nom}</TableCell>}
                  {isColumnVisible("client") && <TableCell>{client?.nom || "-"}</TableCell>}
                  {isColumnVisible("job") && <TableCell>{job?.titre || "-"}</TableCell>}
                  {isColumnVisible("start_end") && (
                    <TableCell>
                      {entry.start_at && entry.end_at
                        ? `${entry.start_at} - ${entry.end_at}`
                        : "-"}
                    </TableCell>
                  )}
                  {isColumnVisible("hours") && <TableCell>{entry.hours.toFixed(2)}h</TableCell>}
                  {isColumnVisible("overtime") && (
                    <TableCell className="text-orange-500">
                      {entry.overtime_hours ? `+${entry.overtime_hours.toFixed(2)}h` : "-"}
                    </TableCell>
                  )}
                  {isColumnVisible("break") && <TableCell>{entry.break_min || 0}min</TableCell>}
                  {isColumnVisible("travel") && <TableCell>{entry.travel_minutes || 0}min</TableCell>}
                  {isColumnVisible("rate") && <TableCell>{entry.hourly_rate || 0}€</TableCell>}
                  {isColumnVisible("cost") && <TableCell className="font-medium">{entry.cost.toFixed(2)}€</TableCell>}
                  {isColumnVisible("is_billable") && (
                    <TableCell>
                      <Badge variant={entry.is_billable ? "default" : "outline"}>
                        {entry.is_billable ? "Oui" : "Non"}
                      </Badge>
                    </TableCell>
                  )}
                  {isColumnVisible("billing_status") && (
                    <TableCell>{getBillingStatusBadge(entry.billing_status)}</TableCell>
                  )}
                  {isColumnVisible("description") && (
                    <TableCell className="max-w-xs truncate">{entry.description || "-"}</TableCell>
                  )}
                  {isColumnVisible("status") && <TableCell>{getStatusBadge(entry.status)}</TableCell>}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingEntry(entry);
                          setModalOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await supabase.from("timesheets_entries").delete().eq("id", entry.id);
                          toast.success("Entrée supprimée");
                          loadData();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {filteredEntries.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Aucune entrée de temps trouvée
          </div>
        )}
      </div>

      {/* Modals */}
      <TimesheetEntryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        entry={editingEntry}
        onSaved={loadData}
      />

      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motif de rejet</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Raison</Label>
            <Input
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ex: Heures incorrectes, intervention non validée..."
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleBulkReject}>
              Rejeter
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DisplayOptionsPanel
        open={displayPanelOpen}
        onOpenChange={setDisplayPanelOpen}
        settings={settings}
        availableColumns={availableColumns}
        onToggleColumn={toggleColumn}
        onSaveView={saveView}
        onDeleteView={deleteView}
        onApplyView={applyView}
      />
    </div>
  );
};

export default Timesheets;
