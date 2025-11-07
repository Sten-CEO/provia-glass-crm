import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2, Download, Upload, X, ChevronDown, ChevronRight, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Client {
  id: string;
  nom: string;
  email: string;
  telephone: string | null;
  ville: string | null;
  adresse: string | null;
  tva: string | null;
  notes: string | null;
  tags: string[] | null;
  statut: string | null;
  demande: string | null;
  debut: string | null;
  fin: string | null;
}

interface ClientSummary {
  devisCount: number;
  devisStatus: string | null;
  devisAcceptes: number;
  facturesCount: number;
  facturesUnpaid: number;
  facturesAmountDue: number;
  facturesOverdue: boolean;
  jobsCount: number;
  jobsStatus: string;
  nextPlanning: { date: string; employee: string } | null;
  lastActivity: string;
}

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsSummary, setClientsSummary] = useState<Map<string, ClientSummary>>(new Map());
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(() => {
    const saved = localStorage.getItem("clients-filters-open");
    return saved ? JSON.parse(saved) : false;
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState({ 
    nom: "", 
    email: "", 
    telephone: "", 
    ville: "", 
    adresse: "", 
    tva: "", 
    notes: "",
    tags: [] as string[],
    statut: "Actif",
    demande: "",
    debut: "",
    fin: ""
  });
  const [tagInput, setTagInput] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem("clients-filters-open", JSON.stringify(filtersOpen));
  }, [filtersOpen]);

  // Get all unique tags from clients
  const allTags = Array.from(new Set(clients.flatMap(c => c.tags || [])));

  // Load clients and their summaries
  const loadClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement");
      return;
    }

    setClients(data || []);
    
    // Load detailed summaries for all clients
    if (data) {
      const summaries = new Map<string, ClientSummary>();
      
      for (const client of data) {
        const [devisData, facturesData, jobsData, planningData] = await Promise.all([
          supabase.from("devis").select("statut, created_at, numero").eq("client_id", client.id).order("created_at", { ascending: false }),
          supabase.from("factures").select("statut, total_ttc, created_at, numero, date_paiement, echeance").eq("client_id", client.id).order("created_at", { ascending: false }),
          supabase.from("jobs").select("statut, created_at, titre").eq("client_id", client.id).order("created_at", { ascending: false }),
          supabase.from("jobs").select("date, heure_debut, employe_nom").eq("client_id", client.id).gte("date", new Date().toISOString().split("T")[0]).order("date", { ascending: true }).limit(1),
        ]);

        // Devis status priority
        let devisStatus = null;
        if (devisData.data?.some(d => d.statut === "Accepté")) devisStatus = "Accepté";
        else if (devisData.data?.some(d => d.statut === "Envoyé")) devisStatus = "Envoyé";
        else if (devisData.data?.some(d => d.statut === "Brouillon")) devisStatus = "Brouillon";
        else if (devisData.data?.some(d => d.statut === "Refusé")) devisStatus = "Refusé";

        // Factures unpaid
        const unpaidFactures = facturesData.data?.filter(f => f.statut !== "Payée") || [];
        const amountDue = unpaidFactures.reduce((sum, f) => sum + (Number(f.total_ttc) || 0), 0);
        const hasOverdue = unpaidFactures.some(f => f.echeance && new Date(f.echeance) < new Date());

        // Jobs status summary
        const jobsInProgress = jobsData.data?.filter(j => j.statut === "En cours").length || 0;
        const jobsDone = jobsData.data?.filter(j => j.statut === "Terminé").length || 0;
        const jobsStatus = jobsInProgress > 0 ? `${jobsInProgress} en cours` + (jobsDone > 0 ? ` · ${jobsDone} terminé${jobsDone > 1 ? "s" : ""}` : "") : jobsDone > 0 ? `${jobsDone} terminé${jobsDone > 1 ? "s" : ""}` : "—";

        // Next planning
        const nextPlanning = planningData.data?.[0] ? { date: planningData.data[0].date, employee: planningData.data[0].employe_nom || "" } : null;

        // Last activity
        let lastActivity = "—";
        const allEvents = [
          ...(devisData.data?.map(d => ({ type: "devis", date: d.created_at, ref: d.numero, status: d.statut })) || []),
          ...(facturesData.data?.map(f => ({ type: "facture", date: f.date_paiement || f.created_at, ref: f.numero, status: f.statut })) || []),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        if (allEvents.length > 0) {
          const latest = allEvents[0];
          const daysAgo = Math.floor((Date.now() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24));
          const timeStr = daysAgo === 0 ? "aujourd'hui" : daysAgo === 1 ? "hier" : `il y a ${daysAgo}j`;
          lastActivity = `${latest.type === "devis" ? "Devis" : "Facture"} ${latest.ref} ${latest.status.toLowerCase()} ${timeStr}`;
        }

        summaries.set(client.id, {
          devisCount: devisData.data?.length || 0,
          devisStatus,
          devisAcceptes: devisData.data?.filter(d => d.statut === "Accepté").length || 0,
          facturesCount: facturesData.data?.length || 0,
          facturesUnpaid: unpaidFactures.length,
          facturesAmountDue: amountDue,
          facturesOverdue: hasOverdue,
          jobsCount: jobsData.data?.length || 0,
          jobsStatus,
          nextPlanning,
          lastActivity,
        });
      }
      
      setClientsSummary(summaries);
    }
  };

  useEffect(() => {
    loadClients();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("clients-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clients",
        },
        () => {
          loadClients();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAddClient = async () => {
    if (!newClient.nom || (!newClient.email && !newClient.telephone)) {
      toast.error("Nom et (email OU téléphone) requis");
      return;
    }

    const { error } = await supabase.from("clients").insert([
      {
        nom: newClient.nom,
        email: newClient.email || null,
        telephone: newClient.telephone || null,
        ville: newClient.ville || null,
        adresse: newClient.adresse || null,
        tva: newClient.tva || null,
        notes: newClient.notes || null,
        tags: newClient.tags.length > 0 ? newClient.tags : null,
        statut: newClient.statut,
        demande: newClient.demande || null,
        debut: newClient.debut || null,
        fin: newClient.fin || null,
      },
    ]);

    if (error) {
      toast.error("Échec de création");
      return;
    }

    toast.success("Client créé avec succès");
    setNewClient({ nom: "", email: "", telephone: "", ville: "", adresse: "", tva: "", notes: "", tags: [], statut: "Actif", demande: "", debut: "", fin: "" });
    setOpen(false);
  };

  const handleEditClient = async () => {
    if (!selectedClient) return;

    const { error } = await supabase
      .from("clients")
      .update({
        nom: selectedClient.nom,
        email: selectedClient.email,
        telephone: selectedClient.telephone,
        ville: selectedClient.ville,
        adresse: selectedClient.adresse,
        tva: selectedClient.tva,
        notes: selectedClient.notes,
        tags: selectedClient.tags,
        statut: selectedClient.statut,
        demande: selectedClient.demande,
        debut: selectedClient.debut,
        fin: selectedClient.fin,
      })
      .eq("id", selectedClient.id);

    if (error) {
      toast.error("Échec de modification");
      return;
    }

    toast.success("Client modifié avec succès");
    setEditOpen(false);
    setSelectedClient(null);
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", selectedClient.id);

    if (error) {
      toast.error("Échec de suppression");
      return;
    }

    toast.success("Client supprimé avec succès");
    setDeleteOpen(false);
    setSelectedClient(null);
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch = 
      client.nom.toLowerCase().includes(search.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(search.toLowerCase())) ||
      (client.telephone && client.telephone.includes(search));
    
    const matchesStatus = filterStatus === "all" || client.statut === filterStatus;
    const matchesTag = filterTag === "all" || (client.tags && client.tags.includes(filterTag));
    
    return matchesSearch && matchesStatus && matchesTag;
  });

  const handleExportCSV = () => {
    const headers = ["Nom", "Email", "Téléphone", "Ville", "Adresse", "TVA", "Statut", "Tags", "Demande", "Début", "Fin", "Notes"];
    const rows = clients.map(c => [
      c.nom,
      c.email || "",
      c.telephone || "",
      c.ville || "",
      c.adresse || "",
      c.tva || "",
      c.statut || "",
      (c.tags || []).join(";"),
      c.demande || "",
      c.debut || "",
      c.fin || "",
      c.notes || "",
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Export CSV réussi");
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n");
      const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
      
      const newClients = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(",").map(v => v.replace(/"/g, "").trim());
        const client: any = {
          nom: values[0],
          email: values[1] || null,
          telephone: values[2] || null,
          ville: values[3] || null,
          adresse: values[4] || null,
          tva: values[5] || null,
          statut: values[6] || "Actif",
          tags: values[7] ? values[7].split(";") : null,
          demande: values[8] || null,
          debut: values[9] || null,
          fin: values[10] || null,
          notes: values[11] || null,
        };
        
        if (client.nom && (client.email || client.telephone)) {
          newClients.push(client);
        }
      }
      
      if (newClients.length > 0) {
        const { error } = await supabase.from("clients").insert(newClients);
        if (error) {
          toast.error("Erreur d'import");
        } else {
          toast.success(`${newClients.length} clients importés`);
        }
      }
    };
    reader.readAsText(file);
  };

  const getStatutBadgeColor = (statut: string | null) => {
    const colors: Record<string, string> = {
      "Actif": "bg-green-500",
      "Inactif": "bg-gray-500",
      "Nouveau": "bg-blue-500",
      "En cours": "bg-yellow-500",
      "Attente de réponses": "bg-orange-500",
      "Résolues": "bg-green-600",
      "Fermé": "bg-gray-600",
      "Rejeté": "bg-red-500",
    };
    return colors[statut || "Actif"] || "bg-gray-500";
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold uppercase tracking-wide">Clients</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
          </Button>
          <label>
            <Button variant="outline" size="sm" asChild>
              <span>
                <Upload className="h-4 w-4" />
              </span>
            </Button>
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} />
          </label>
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-foreground font-semibold">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau client
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-modal max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="uppercase tracking-wide">Nouveau Client</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={newClient.nom}
                  onChange={(e) => setNewClient({ ...newClient, nom: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={newClient.telephone}
                  onChange={(e) => setNewClient({ ...newClient, telephone: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label htmlFor="ville">Ville</Label>
                <Input
                  id="ville"
                  value={newClient.ville}
                  onChange={(e) => setNewClient({ ...newClient, ville: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  id="adresse"
                  value={newClient.adresse}
                  onChange={(e) => setNewClient({ ...newClient, adresse: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label htmlFor="tva">Numéro TVA</Label>
                <Input
                  id="tva"
                  value={newClient.tva}
                  onChange={(e) => setNewClient({ ...newClient, tva: e.target.value })}
                  className="glass-card"
                />
              </div>
              <div>
                <Label htmlFor="statut">Statut</Label>
                <select
                  id="statut"
                  value={newClient.statut}
                  onChange={(e) => setNewClient({ ...newClient, statut: e.target.value })}
                  className="w-full p-2 glass-card rounded-md"
                >
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                  <option value="Nouveau">Nouveau</option>
                </select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {newClient.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => setNewClient({ ...newClient, tags: newClient.tags.filter((_, idx) => idx !== i) })}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tagInput.trim()) {
                        e.preventDefault();
                        setNewClient({ ...newClient, tags: [...newClient.tags, tagInput.trim()] });
                        setTagInput("");
                      }
                    }}
                    placeholder="Ajouter un tag..."
                    className="glass-card"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (tagInput.trim()) {
                        setNewClient({ ...newClient, tags: [...newClient.tags, tagInput.trim()] });
                        setTagInput("");
                      }
                    }}
                  >
                    +
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleAddClient}
                className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold"
              >
                Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Compact Search & Filters */}
      <div className="glass-card p-3 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 glass-card h-9"
            />
          </div>
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="whitespace-nowrap">
                <Filter className="h-4 w-4 mr-2" />
                Filtres
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="glass-card p-3 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Statut</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="glass-card h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        <SelectItem value="Actif">Actif</SelectItem>
                        <SelectItem value="Inactif">Inactif</SelectItem>
                        <SelectItem value="Nouveau">Nouveau</SelectItem>
                        <SelectItem value="En cours">En cours</SelectItem>
                        <SelectItem value="Fermé">Fermé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Tag</Label>
                    <Select value={filterTag} onValueChange={setFilterTag}>
                      <SelectTrigger className="glass-card h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous</SelectItem>
                        {allTags.map(tag => (
                          <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* New Table with Synthesis Columns */}
      <div className="glass-card overflow-hidden pb-20">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10 sticky top-0 glass-card z-10">
              <tr>
                <th className="text-left p-2 font-semibold uppercase tracking-wide text-xs w-8"></th>
                <th className="text-left p-2 font-semibold uppercase tracking-wide text-xs">Nom</th>
                <th className="text-left p-2 font-semibold uppercase tracking-wide text-xs">Statut</th>
                <th className="text-left p-2 font-semibold uppercase tracking-wide text-xs">Tags</th>
                <th className="text-left p-2 font-semibold uppercase tracking-wide text-xs">Devis</th>
                <th className="text-left p-2 font-semibold uppercase tracking-wide text-xs">Factures</th>
                <th className="text-left p-2 font-semibold uppercase tracking-wide text-xs">Jobs</th>
                <th className="text-left p-2 font-semibold uppercase tracking-wide text-xs">Planning</th>
                <th className="text-left p-2 font-semibold uppercase tracking-wide text-xs">Activité</th>
                <th className="text-left p-2 font-semibold uppercase tracking-wide text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const summary = clientsSummary.get(client.id);
                const isExpanded = expandedRows.has(client.id);
                return (
                  <>
                    <tr
                      key={client.id}
                      className="border-b border-white/5 hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-2">
                        <button
                          onClick={() => {
                            const newExpanded = new Set(expandedRows);
                            if (isExpanded) newExpanded.delete(client.id);
                            else newExpanded.add(client.id);
                            setExpandedRows(newExpanded);
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td
                        className="p-2 font-medium cursor-pointer"
                        onClick={() => navigate(`/clients/${client.id}`)}
                      >
                        <div className="font-semibold text-sm">{client.nom}</div>
                        <div className="text-xs text-muted-foreground">{client.email || client.telephone}</div>
                      </td>
                      <td className="p-2">
                        <Badge className={`${getStatutBadgeColor(client.statut)} text-xs`}>
                          {client.statut || "Actif"}
                        </Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1 flex-wrap">
                          {(client.tags || []).slice(0, 2).map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {(client.tags || []).length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{(client.tags || []).length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        {summary && (
                          <button
                            onClick={() => navigate(`/devis?client_id=${client.id}`)}
                            className="text-left hover:opacity-80 transition-opacity"
                          >
                            <div className="text-xs font-medium">{summary.devisCount} devis</div>
                            {summary.devisStatus && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {summary.devisStatus}
                              </Badge>
                            )}
                          </button>
                        )}
                      </td>
                      <td className="p-2">
                        {summary && (
                          <button
                            onClick={() => navigate(`/factures?client_id=${client.id}`)}
                            className="text-left hover:opacity-80 transition-opacity"
                          >
                            <div className="text-xs font-medium">
                              {summary.facturesUnpaid}/{summary.facturesCount}
                            </div>
                            {summary.facturesAmountDue > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {summary.facturesAmountDue.toLocaleString()} € dû
                              </div>
                            )}
                            {summary.facturesOverdue && (
                              <Badge variant="destructive" className="text-xs mt-1">En retard</Badge>
                            )}
                          </button>
                        )}
                      </td>
                      <td className="p-2">
                        {summary && (
                          <button
                            onClick={() => navigate(`/jobs?client_id=${client.id}`)}
                            className="text-left hover:opacity-80 transition-opacity"
                          >
                            <div className="text-xs text-muted-foreground">{summary.jobsStatus}</div>
                          </button>
                        )}
                      </td>
                      <td className="p-2">
                        {summary?.nextPlanning ? (
                          <button
                            onClick={() => navigate(`/planning?client_id=${client.id}`)}
                            className="text-left hover:opacity-80 transition-opacity"
                          >
                            <div className="text-xs font-medium">
                              {new Date(summary.nextPlanning.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                            </div>
                            {summary.nextPlanning.employee && (
                              <div className="text-xs text-muted-foreground">{summary.nextPlanning.employee.split(" ").map(n => n[0]).join("")}</div>
                            )}
                          </button>
                        ) : (
                          <div className="text-xs text-muted-foreground">—</div>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={summary?.lastActivity}>
                          {summary?.lastActivity || "—"}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setSelectedClient(client);
                              setEditOpen(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setSelectedClient(client);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${client.id}-expanded`} className="border-b border-white/5 bg-muted/10">
                        <td colSpan={10} className="p-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div>
                              <div className="font-semibold mb-1 text-muted-foreground">Derniers devis</div>
                              <div className="space-y-1">
                                {/* Placeholder - would need actual data */}
                                <div className="text-muted-foreground">Chargement...</div>
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold mb-1 text-muted-foreground">Dernières factures</div>
                              <div className="space-y-1">
                                <div className="text-muted-foreground">Chargement...</div>
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold mb-1 text-muted-foreground">Jobs en cours</div>
                              <div className="space-y-1">
                                <div className="text-muted-foreground">Chargement...</div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="glass-modal max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wide">Modifier Client</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div>
                <Label>Nom *</Label>
                <Input
                  value={selectedClient.nom}
                  onChange={(e) =>
                    setSelectedClient({ ...selectedClient, nom: e.target.value })
                  }
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  value={selectedClient.email}
                  onChange={(e) =>
                    setSelectedClient({ ...selectedClient, email: e.target.value })
                  }
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  value={selectedClient.telephone || ""}
                  onChange={(e) =>
                    setSelectedClient({ ...selectedClient, telephone: e.target.value })
                  }
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Ville</Label>
                <Input
                  value={selectedClient.ville || ""}
                  onChange={(e) =>
                    setSelectedClient({ ...selectedClient, ville: e.target.value })
                  }
                  className="glass-card"
                />
              </div>
              <div>
                <Label>Statut</Label>
                <select
                  value={selectedClient.statut || "Actif"}
                  onChange={(e) => setSelectedClient({ ...selectedClient, statut: e.target.value })}
                  className="w-full p-2 glass-card rounded-md"
                >
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                  <option value="Nouveau">Nouveau</option>
                  <option value="En cours">En cours</option>
                  <option value="Fermé">Fermé</option>
                </select>
              </div>
              <div className="col-span-2">
                <Label>Tags</Label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {(selectedClient.tags || []).map((tag, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => 
                          setSelectedClient({ 
                            ...selectedClient, 
                            tags: (selectedClient.tags || []).filter((_, idx) => idx !== i) 
                          })
                        }
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tagInput.trim()) {
                        e.preventDefault();
                        setSelectedClient({ 
                          ...selectedClient, 
                          tags: [...(selectedClient.tags || []), tagInput.trim()] 
                        });
                        setTagInput("");
                      }
                    }}
                    placeholder="Ajouter un tag..."
                    className="glass-card"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (tagInput.trim()) {
                        setSelectedClient({ 
                          ...selectedClient, 
                          tags: [...(selectedClient.tags || []), tagInput.trim()] 
                        });
                        setTagInput("");
                      }
                    }}
                  >
                    +
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleEditClient}
                className="w-full bg-primary hover:bg-primary/90 text-foreground font-semibold"
              >
                Enregistrer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="glass-modal">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              className="bg-destructive hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clients;
