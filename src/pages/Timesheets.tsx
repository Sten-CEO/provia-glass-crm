import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Download, Settings2, Edit, Trash2, Eye, Check, X, Send } from "lucide-react";
import { format, addDays, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkDeleteToolbar } from "@/components/common/BulkDeleteToolbar";
import { DisplayOptionsPanel } from "@/components/common/DisplayOptionsPanel";
import { useDisplaySettings } from "@/hooks/useDisplaySettings";
import { TimesheetEntryModal } from "@/components/timesheets/TimesheetEntryModal";
import { TimesheetDetailPanel } from "@/components/timesheets/TimesheetDetailPanel";

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
  const [breaksData, setBreaksData] = useState<Record<string, any[]>>({});
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null);

  const {
    selectedIds,
    selectedCount,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    allSelected,
  } = useBulkSelection<TimesheetEntry>(entries);

  const [selectedOvertimeFilter, setSelectedOvertimeFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const availableColumns = [
    { key: "date", label: "Date" },
    { key: "employee", label: "Employé" },
    { key: "job", label: "Intervention" },
    { key: "start_time", label: "Heure début" },
    { key: "end_time", label: "Heure fin" },
    { key: "total_duration", label: "Durée totale" },
    { key: "breaks_count", label: "Pause(s)" },
    { key: "break_duration", label: "Durée pause(s)" },
    { key: "net_hours", label: "Heures nettes" },
    { key: "status", label: "Statut" },
  ];

  const statusLabels: Record<string, string> = {
    draft: "Brouillon",
    submitted: "À valider",
    approved: "Validé",
    rejected: "Rejeté",
  };

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

    if (entriesRes.data) {
      setEntries(entriesRes.data as unknown as TimesheetEntry[]);
      
      // Load breaks for all entries
      const entryIds = entriesRes.data.map((e: any) => e.id);
      if (entryIds.length > 0) {
        const { data: breaks } = await supabase
          .from("timesheet_breaks")
          .select("*")
          .in("timesheet_entry_id", entryIds);
        
        if (breaks) {
          const breaksMap: Record<string, any[]> = {};
          breaks.forEach((b: any) => {
            if (!breaksMap[b.timesheet_entry_id]) {
              breaksMap[b.timesheet_entry_id] = [];
            }
            breaksMap[b.timesheet_entry_id].push(b);
          });
          setBreaksData(breaksMap);
        }
      }
    }
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
      
      // Overtime filter
      if (selectedOvertimeFilter === "with_overtime" && (!e.overtime_hours || e.overtime_hours <= 0)) return false;
      if (selectedOvertimeFilter === "without_overtime" && e.overtime_hours && e.overtime_hours > 0) return false;
      
      return true;
    });
  };

  const calculateBreakMinutes = (entryId: string) => {
    const breaks = breaksData[entryId] || [];
    return breaks.reduce((total, b) => total + (b.duration_minutes || 0), 0);
  };

  const calculateNetHours = (entry: TimesheetEntry) => {
    const breakMinutes = calculateBreakMinutes(entry.id);
    const totalMinutes = entry.hours * 60;
    const netMinutes = totalMinutes - breakMinutes;
    return netMinutes / 60;
  };

  const formatTime = (time?: string) => {
    if (!time) return "-";
    return time.substring(0, 5);
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m > 0 ? m.toString().padStart(2, '0') : ''}`;
  };

  const getStatusBadge = (status: string) => {
    const statusClass = {
      approved: "bg-green-500",
      submitted: "bg-yellow-500",
      rejected: "bg-red-500",
      draft: "bg-gray-500"
    }[status] || "bg-gray-500";

    return <Badge className={statusClass}>{statusLabels[status] || status}</Badge>;
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold uppercase tracking-wide">Pointage</h1>
            <p className="text-muted-foreground">Gestion du temps de travail et suivi des heures</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setDisplayPanelOpen(true)} variant="outline" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Options d'affichage
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div>
            <Label className="text-xs text-muted-foreground uppercase">Employé</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {employees.filter((e) => e.id && e.id.trim() !== "").map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground uppercase">Période</Label>
            <Select 
              value={startDate === format(new Date(), "yyyy-MM-dd") ? "today" : 
                     startDate === format(addDays(new Date(), -7), "yyyy-MM-dd") ? "week" : 
                     startDate === format(addDays(new Date(), -30), "yyyy-MM-dd") ? "month" : "custom"}
              onValueChange={(val) => {
                if (val === "today") {
                  setStartDate(format(new Date(), "yyyy-MM-dd"));
                  setEndDate(format(new Date(), "yyyy-MM-dd"));
                } else if (val === "week") {
                  setStartDate(format(addDays(new Date(), -7), "yyyy-MM-dd"));
                  setEndDate(format(new Date(), "yyyy-MM-dd"));
                } else if (val === "month") {
                  setStartDate(format(addDays(new Date(), -30), "yyyy-MM-dd"));
                  setEndDate(format(new Date(), "yyyy-MM-dd"));
                }
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="week">Semaine</SelectItem>
                <SelectItem value="month">Mois</SelectItem>
                <SelectItem value="custom">Personnalisé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-xs text-muted-foreground uppercase">Statut</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="submitted">En cours</SelectItem>
                <SelectItem value="approved">Terminé</SelectItem>
                <SelectItem value="rejected">Validé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground uppercase">Début</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground uppercase">Fin</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{filteredEntries.length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Entrées</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{totalHours.toFixed(1)}h</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total heures</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{billableHours.toFixed(1)}h</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Facturables</div>
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
            <TableRow className="bg-muted/30">
              <TableHead className="w-12">
                <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              </TableHead>
              {isColumnVisible("date") && <TableHead className="font-semibold">Date</TableHead>}
              {isColumnVisible("employee") && <TableHead className="font-semibold">Employé</TableHead>}
              {isColumnVisible("job") && <TableHead className="font-semibold">Intervention</TableHead>}
              {isColumnVisible("start_time") && <TableHead className="font-semibold">Heure début</TableHead>}
              {isColumnVisible("end_time") && <TableHead className="font-semibold">Heure fin</TableHead>}
              {isColumnVisible("total_duration") && <TableHead className="font-semibold">Durée totale</TableHead>}
              {isColumnVisible("breaks_count") && <TableHead className="font-semibold">Pause(s)</TableHead>}
              {isColumnVisible("break_duration") && <TableHead className="font-semibold">Durée pause(s)</TableHead>}
              {isColumnVisible("net_hours") && <TableHead className="font-semibold">Heures nettes</TableHead>}
              {isColumnVisible("status") && <TableHead className="font-semibold">Statut</TableHead>}
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.map((entry) => {
              const emp = employees.find((e) => e.id === entry.employee_id);
              const client = clients.find((c) => c.id === entry.client_id);
              const job = jobs.find((j) => j.id === entry.job_id);
              const entryBreaks = breaksData[entry.id] || [];
              const totalBreakMinutes = entryBreaks.reduce((sum: number, b: any) => sum + (b.duration_minutes || 0), 0);
              const netHours = entry.hours - (totalBreakMinutes / 60);

              return (
                <TableRow 
                  key={entry.id} 
                  className="hover:bg-muted/20 cursor-pointer"
                  onClick={() => {
                    setSelectedEntry(entry);
                    setDetailPanelOpen(true);
                  }}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected(entry.id)}
                      onCheckedChange={() => toggleItem(entry.id)}
                    />
                  </TableCell>
                  {isColumnVisible("date") && (
                    <TableCell className="font-medium">
                      {format(new Date(entry.date), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                  )}
                  {isColumnVisible("employee") && (
                    <TableCell className="font-medium">{emp?.nom || "-"}</TableCell>
                  )}
                  {isColumnVisible("job") && (
                    <TableCell>{job?.titre || "Temps administratif"}</TableCell>
                  )}
                  {isColumnVisible("start_time") && (
                    <TableCell className="text-muted-foreground">
                      {formatTime(entry.start_at)}
                    </TableCell>
                  )}
                  {isColumnVisible("end_time") && (
                    <TableCell className="text-muted-foreground">
                      {formatTime(entry.end_at)}
                    </TableCell>
                  )}
                  {isColumnVisible("total_duration") && (
                    <TableCell className="font-medium">{formatDuration(entry.hours)}</TableCell>
                  )}
                  {isColumnVisible("breaks_count") && (
                    <TableCell>
                      {entryBreaks.length > 0 ? (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                          {entryBreaks.length}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  )}
                  {isColumnVisible("break_duration") && (
                    <TableCell className="text-orange-600 font-medium">
                      {totalBreakMinutes > 0 ? `${totalBreakMinutes} min` : "-"}
                    </TableCell>
                  )}
                  {isColumnVisible("net_hours") && (
                    <TableCell className="font-semibold text-success">
                      {formatDuration(netHours)}
                    </TableCell>
                  )}
                  {isColumnVisible("status") && (
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                  )}
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEntry(entry);
                          setModalOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm("Supprimer cette entrée ?")) {
                            await supabase.from("timesheets_entries").delete().eq("id", entry.id);
                            toast.success("Entrée supprimée");
                            loadData();
                          }
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
            Aucune entrée de pointage trouvée pour les filtres sélectionnés
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

      <TimesheetDetailPanel
        open={detailPanelOpen}
        onOpenChange={setDetailPanelOpen}
        entry={selectedEntry}
        employeeName={selectedEntry ? employees.find(e => e.id === selectedEntry.employee_id)?.nom : undefined}
        clientName={selectedEntry ? clients.find(c => c.id === selectedEntry.client_id)?.nom : undefined}
        jobTitle={selectedEntry ? jobs.find(j => j.id === selectedEntry.job_id)?.titre : undefined}
        breaks={selectedEntry ? breaksData[selectedEntry.id] || [] : []}
        onEdit={() => {
          if (selectedEntry) {
            setEditingEntry(selectedEntry);
            setModalOpen(true);
            setDetailPanelOpen(false);
          }
        }}
      />
    </div>
  );
};

export default Timesheets;
