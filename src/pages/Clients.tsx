import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit, Trash2, Download, Upload, X, ChevronDown, ChevronRight, Filter, Eye, Phone, ChevronUp, ChevronsUpDown, Settings } from "lucide-react";
import { DisplayOptionsPanel } from "@/components/clients/DisplayOptionsPanel";
import { BulkDeleteToolbar } from "@/components/common/BulkDeleteToolbar";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/ui/status-chip";
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
  devisStatusVariant: "green" | "blue" | "gray" | "red" | null;
  devisAcceptes: number;
  facturesCount: number;
  facturesUnpaid: number;
  facturesAmountDue: number;
  facturesOverdue: boolean;
  factureStatus: string | null;
  factureStatusVariant: "green" | "red" | "amber" | null;
  jobsCount: number;
  jobsInProgress: number;
  jobsDone: number;
  jobsStatus: string;
  jobStatusVariant: "blue" | "gray" | null;
  nextPlanning: { date: string; employee: string } | null;
  lastActivity: string;
  lastActivityTimestamp: number;
}

type SortDirection = "asc" | "desc";
type SortField = "nom" | "statut" | "ville" | "devis" | "factures" | "jobs" | "planning" | "activite";

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

type QuickFilter = "actifs" | "factures_encaisser" | "en_retard" | "devis_acceptes" | "jobs_cours" | "echeance_semaine" | "sans_activite";

// Component for expanded row view
const ExpandedClientView = ({ clientId }: { clientId: string }) => {
  const [data, setData] = useState<{
    devis: any[];
    factures: any[];
    jobs: any[];
    loading: boolean;
  }>({ devis: [], factures: [], jobs: [], loading: true });
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted && data.loading) {
        setData({ devis: [], factures: [], jobs: [], loading: false });
      }
    }, 4000);

    const loadData = async () => {
      const [devisRes, facturesRes, jobsRes] = await Promise.all([
        supabase.from("devis").select("numero, statut, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(2),
        supabase.from("factures").select("numero, statut, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(2),
        supabase.from("jobs").select("titre, date, statut").eq("client_id", clientId).in("statut", ["En cours", "À faire", "Assigné"]).limit(2),
      ]);

      if (mounted) {
        setData({
          devis: devisRes.data || [],
          factures: facturesRes.data || [],
          jobs: jobsRes.data || [],
          loading: false,
        });
      }
    };

    loadData();

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [clientId]);

  if (data.loading) {
    return (
      <div className="text-center py-4 text-muted-foreground text-xs">
        Chargement des détails...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs animate-in fade-in duration-200">
      <div>
        <div className="font-semibold mb-2 text-muted-foreground flex items-center justify-between">
          Derniers devis
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/devis?client_id=${clientId}`)}
            className="h-6 text-xs"
          >
            Voir tout
          </Button>
        </div>
        <div className="space-y-2">
          {data.devis.length > 0 ? (
            data.devis.map((d) => (
              <div key={d.numero} className="flex items-center justify-between p-2 glass-card rounded">
                <span>{d.numero}</span>
                <Badge variant="outline" className="text-xs">{d.statut}</Badge>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground">Aucun devis</div>
          )}
        </div>
      </div>
      <div>
        <div className="font-semibold mb-2 text-muted-foreground flex items-center justify-between">
          Dernières factures
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/factures?client_id=${clientId}`)}
            className="h-6 text-xs"
          >
            Voir tout
          </Button>
        </div>
        <div className="space-y-2">
          {data.factures.length > 0 ? (
            data.factures.map((f) => (
              <div key={f.numero} className="flex items-center justify-between p-2 glass-card rounded">
                <span>{f.numero}</span>
                <Badge variant="outline" className="text-xs">{f.statut}</Badge>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground">Aucune facture</div>
          )}
        </div>
      </div>
      <div>
        <div className="font-semibold mb-2 text-muted-foreground flex items-center justify-between">
          Jobs en cours
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/jobs?client_id=${clientId}`)}
            className="h-6 text-xs"
          >
            Voir tout
          </Button>
        </div>
        <div className="space-y-2">
          {data.jobs.length > 0 ? (
            data.jobs.map((j, i) => (
              <div key={i} className="p-2 glass-card rounded">
                <div className="font-medium">{j.titre}</div>
                <div className="text-muted-foreground">{j.date}</div>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground">Aucun job en cours</div>
          )}
        </div>
      </div>
    </div>
  );
};

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsSummary, setClientsSummary] = useState<Map<string, ClientSummary>>(new Map());
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [filtersOpen, setFiltersOpen] = useState(() => {
    const saved = localStorage.getItem("clients-filters-open");
    return saved ? JSON.parse(saved) : false;
  });
  
  // Sort state with localStorage persistence
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>(() => {
    const saved = localStorage.getItem("pv_clients_sort");
    return saved ? JSON.parse(saved) : [{ field: "nom", direction: "asc" }];
  });

  // Quick filters state with localStorage persistence
  const [activeQuickFilters, setActiveQuickFilters] = useState<Set<QuickFilter>>(() => {
    const saved = localStorage.getItem("pv_clients_filters");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem("pv_clients_pageSize");
    return saved ? parseInt(saved) : 50;
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
    statut: "nouveau",
    demande: "",
    debut: "",
    fin: ""
  });
  const [tagInput, setTagInput] = useState("");
  const navigate = useNavigate();
  
  // Display options state
  const [displayOptionsOpen, setDisplayOptionsOpen] = useState(false);
  const [displayOptions, setDisplayOptions] = useState(() => {
    const saved = localStorage.getItem("pv_clients_display_options");
    return saved
      ? JSON.parse(saved)
      : {
          standardFields: {
            telephone: true,
            ville: true,
            adresse: false,
            tva: false,
            tags: true,
            statut: true,
            devis: true,
            factures: true,
            jobs: true,
            planning: true,
            activite: true,
          },
          customFields: [],
        };
  });

  // Bulk selection for mass delete
  const {
    selectedIds,
    selectedCount,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    allSelected,
  } = useBulkSelection(clients);

  const handleSaveDisplayOptions = (options: any) => {
    setDisplayOptions(options);
    localStorage.setItem("pv_clients_display_options", JSON.stringify(options));
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Persist sort config
  useEffect(() => {
    localStorage.setItem("pv_clients_sort", JSON.stringify(sortConfigs));
  }, [sortConfigs]);

  // Persist quick filters
  useEffect(() => {
    localStorage.setItem("pv_clients_filters", JSON.stringify(Array.from(activeQuickFilters)));
  }, [activeQuickFilters]);

  // Persist page size
  useEffect(() => {
    localStorage.setItem("pv_clients_pageSize", pageSize.toString());
  }, [pageSize]);

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
        let devisStatusVariant: "green" | "blue" | "gray" | "red" | null = null;
        if (devisData.data?.some(d => d.statut === "Accepté")) {
          devisStatus = "Accepté";
          devisStatusVariant = "green";
        } else if (devisData.data?.some(d => d.statut === "Envoyé")) {
          devisStatus = "Envoyé";
          devisStatusVariant = "blue";
        } else if (devisData.data?.some(d => d.statut === "Brouillon")) {
          devisStatus = "Brouillon";
          devisStatusVariant = "gray";
        } else if (devisData.data?.some(d => d.statut === "Refusé")) {
          devisStatus = "Refusé";
          devisStatusVariant = "red";
        }

        // Factures status
        const unpaidFactures = facturesData.data?.filter(f => f.statut !== "Payée") || [];
        const amountDue = unpaidFactures.reduce((sum, f) => sum + (Number(f.total_ttc) || 0), 0);
        const hasOverdue = unpaidFactures.some(f => f.echeance && new Date(f.echeance) < new Date());
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let factureStatus: string | null = null;
        let factureStatusVariant: "green" | "red" | "amber" | null = null;
        
        if (facturesData.data?.some(f => f.statut === "Payée")) {
          factureStatus = "Payée";
          factureStatusVariant = "green";
        } else if (hasOverdue) {
          factureStatus = "En retard";
          factureStatusVariant = "red";
        } else if (unpaidFactures.length > 0) {
          factureStatus = "À encaisser";
          factureStatusVariant = "amber";
        }

        // Jobs status summary
        const jobsInProgress = jobsData.data?.filter(j => j.statut === "En cours" || j.statut === "À faire" || j.statut === "Assigné").length || 0;
        const jobsDone = jobsData.data?.filter(j => j.statut === "Terminé").length || 0;
        const jobsStatus = jobsInProgress > 0 ? `${jobsInProgress} en cours` + (jobsDone > 0 ? ` · ${jobsDone} terminé${jobsDone > 1 ? "s" : ""}` : "") : jobsDone > 0 ? `${jobsDone} terminé${jobsDone > 1 ? "s" : ""}` : "—";
        
        let jobStatusVariant: "blue" | "gray" | null = null;
        if (jobsInProgress > 0) jobStatusVariant = "blue";
        else if (jobsDone > 0) jobStatusVariant = "gray";

        // Next planning
        const nextPlanning = planningData.data?.[0] ? { date: planningData.data[0].date, employee: planningData.data[0].employe_nom || "" } : null;

        // Last activity
        let lastActivity = "—";
        let lastActivityTimestamp = 0;
        const allEvents = [
          ...(devisData.data?.map(d => ({ type: "devis", date: d.created_at, ref: d.numero, status: d.statut })) || []),
          ...(facturesData.data?.map(f => ({ type: "facture", date: f.date_paiement || f.created_at, ref: f.numero, status: f.statut })) || []),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        if (allEvents.length > 0) {
          const latest = allEvents[0];
          lastActivityTimestamp = new Date(latest.date).getTime();
          const daysAgo = Math.floor((Date.now() - lastActivityTimestamp) / (1000 * 60 * 60 * 24));
          const timeStr = daysAgo === 0 ? "aujourd'hui" : daysAgo === 1 ? "hier" : `il y a ${daysAgo}j`;
          lastActivity = `${latest.type === "devis" ? "Devis" : "Facture"} ${latest.ref} ${latest.status.toLowerCase()} ${timeStr}`;
        }

        summaries.set(client.id, {
          devisCount: devisData.data?.length || 0,
          devisStatus,
          devisStatusVariant,
          devisAcceptes: devisData.data?.filter(d => d.statut === "Accepté").length || 0,
          facturesCount: facturesData.data?.length || 0,
          facturesUnpaid: unpaidFactures.length,
          facturesAmountDue: amountDue,
          facturesOverdue: hasOverdue,
          factureStatus,
          factureStatusVariant,
          jobsCount: jobsData.data?.length || 0,
          jobsInProgress,
          jobsDone,
          jobsStatus,
          jobStatusVariant,
          nextPlanning,
          lastActivity,
          lastActivityTimestamp,
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
    setNewClient({ nom: "", email: "", telephone: "", ville: "", adresse: "", tva: "", notes: "", tags: [], statut: "nouveau", demande: "", debut: "", fin: "" });
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

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const { error } = await supabase
      .from("clients")
      .delete()
      .in("id", selectedIds);

    if (error) {
      console.error("Erreur lors de la suppression groupée:", error);
      toast.error("Échec de la suppression groupée");
      return;
    }

    toast.success(`${selectedIds.length} client${selectedIds.length > 1 ? "s supprimés" : " supprimé"} avec succès`);
    clearSelection();
    loadClients();
  };

  // Enhanced search with highlighting
  const highlightMatch = (text: string, search: string) => {
    if (!search.trim()) return text;
    const index = text.toLowerCase().indexOf(search.toLowerCase());
    if (index === -1) return text;
    return (
      <>
        {text.slice(0, index)}
        <mark className="bg-primary/30 px-0.5 rounded">{text.slice(index, index + search.length)}</mark>
        {text.slice(index + search.length)}
      </>
    );
  };

  // Multi-sort & filter logic
  const filteredAndSortedClients = useMemo(() => {
    let result = clients.filter((client) => {
      // Enhanced search
      const searchLower = debouncedSearch.toLowerCase();
      const matchesSearch = 
        !debouncedSearch ||
        client.nom.toLowerCase().includes(searchLower) ||
        (client.email && client.email.toLowerCase().includes(searchLower)) ||
        (client.telephone && client.telephone.includes(searchLower)) ||
        (client.ville && client.ville.toLowerCase().includes(searchLower)) ||
        (client.adresse && client.adresse.toLowerCase().includes(searchLower)) ||
        (client.tva && client.tva.toLowerCase().includes(searchLower)) ||
        (client.demande && client.demande.toLowerCase().includes(searchLower)) ||
        (client.tags && client.tags.some(t => t.toLowerCase().includes(searchLower)));
      
      const matchesStatus = filterStatus === "all" || client.statut === filterStatus;
      const matchesTag = filterTag === "all" || (client.tags && client.tags.includes(filterTag));
      
      // Quick filters
      const summary = clientsSummary.get(client.id);
      let matchesQuickFilters = true;

      if (activeQuickFilters.size > 0) {
        const filters = Array.from(activeQuickFilters);
        matchesQuickFilters = filters.every(filter => {
          switch (filter) {
            case "actifs":
              return client.statut === "en_cours" || client.statut === "nouveau";
            case "factures_encaisser":
              return summary && summary.facturesUnpaid > 0;
            case "en_retard":
              return summary && summary.facturesOverdue;
            case "devis_acceptes":
              return summary && summary.devisAcceptes > 0;
            case "jobs_cours":
              return summary && summary.jobsInProgress > 0;
            case "echeance_semaine":
              const nextWeek = new Date();
              nextWeek.setDate(nextWeek.getDate() + 7);
              return summary?.nextPlanning && new Date(summary.nextPlanning.date) <= nextWeek;
            case "sans_activite":
              const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
              return !summary || summary.lastActivityTimestamp < thirtyDaysAgo;
            default:
              return true;
          }
        });
      }
      
      return matchesSearch && matchesStatus && matchesTag && matchesQuickFilters;
    });

    // Multi-column sorting
    if (sortConfigs.length > 0) {
      result.sort((a, b) => {
        for (const config of sortConfigs) {
          const summaryA = clientsSummary.get(a.id);
          const summaryB = clientsSummary.get(b.id);
          let comparison = 0;

          switch (config.field) {
            case "nom":
              comparison = a.nom.localeCompare(b.nom);
              break;
            case "statut":
              const statusOrder = { en_cours: 0, nouveau: 1, attente: 2, resolues: 3, ferme: 4, rejete: 5 };
              comparison = (statusOrder[a.statut as keyof typeof statusOrder] || 99) - (statusOrder[b.statut as keyof typeof statusOrder] || 99);
              break;
            case "ville":
              comparison = (a.ville || "").localeCompare(b.ville || "");
              break;
            case "devis":
              comparison = (summaryB?.devisCount || 0) - (summaryA?.devisCount || 0);
              break;
            case "factures":
              // Sort by amount due first, then by unpaid count
              const amountDiff = (summaryB?.facturesAmountDue || 0) - (summaryA?.facturesAmountDue || 0);
              comparison = amountDiff !== 0 ? amountDiff : (summaryB?.facturesUnpaid || 0) - (summaryA?.facturesUnpaid || 0);
              break;
            case "jobs":
              // Sort by in_progress first, then by done
              const inProgressDiff = (summaryB?.jobsInProgress || 0) - (summaryA?.jobsInProgress || 0);
              comparison = inProgressDiff !== 0 ? inProgressDiff : (summaryA?.jobsDone || 0) - (summaryB?.jobsDone || 0);
              break;
            case "planning":
              const dateA = summaryA?.nextPlanning?.date ? new Date(summaryA.nextPlanning.date).getTime() : Number.MAX_SAFE_INTEGER;
              const dateB = summaryB?.nextPlanning?.date ? new Date(summaryB.nextPlanning.date).getTime() : Number.MAX_SAFE_INTEGER;
              comparison = dateA - dateB;
              break;
            case "activite":
              comparison = (summaryB?.lastActivityTimestamp || 0) - (summaryA?.lastActivityTimestamp || 0);
              break;
          }

          if (comparison !== 0) {
            return config.direction === "asc" ? comparison : -comparison;
          }
        }
        return 0;
      });
    }

    return result;
  }, [clients, debouncedSearch, filterStatus, filterTag, activeQuickFilters, clientsSummary, sortConfigs]);

  // Pagination
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedClients.slice(start, start + pageSize);
  }, [filteredAndSortedClients, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedClients.length / pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatus, filterTag, activeQuickFilters]);

  // Sort handler
  const handleSort = (field: SortField, shiftKey: boolean) => {
    if (shiftKey) {
      // Multi-sort: add or update this field
      const existing = sortConfigs.findIndex(s => s.field === field);
      if (existing >= 0) {
        // Toggle direction
        const newConfigs = [...sortConfigs];
        newConfigs[existing].direction = newConfigs[existing].direction === "asc" ? "desc" : "asc";
        setSortConfigs(newConfigs);
      } else {
        // Add new sort
        setSortConfigs([...sortConfigs, { field, direction: "asc" }]);
      }
    } else {
      // Single sort
      const existing = sortConfigs.find(s => s.field === field);
      if (existing && sortConfigs.length === 1) {
        // Toggle direction
        setSortConfigs([{ field, direction: existing.direction === "asc" ? "desc" : "asc" }]);
      } else {
        // Set as primary sort
        setSortConfigs([{ field, direction: "asc" }]);
      }
    }
  };

  // Get sort indicator for column
  const getSortIndicator = (field: SortField) => {
    const index = sortConfigs.findIndex(s => s.field === field);
    if (index === -1) return null;
    const config = sortConfigs[index];
    return (
      <span className="inline-flex items-center gap-0.5 ml-1">
        {config.direction === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {sortConfigs.length > 1 && <span className="text-[10px] opacity-60">{index + 1}</span>}
      </span>
    );
  };

  // Quick filter toggle
  const toggleQuickFilter = (filter: QuickFilter) => {
    const newFilters = new Set(activeQuickFilters);
    if (newFilters.has(filter)) {
      newFilters.delete(filter);
    } else {
      newFilters.add(filter);
    }
    setActiveQuickFilters(newFilters);
  };

  const handleExportCSV = () => {
    const headers = ["Nom", "Email", "Téléphone", "Ville", "Adresse", "TVA", "Statut", "Tags", "Demande", "Début", "Fin", "Notes"];
    // Export filtered and sorted clients only
    const rows = filteredAndSortedClients.map(c => [
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
    toast.success(`Export CSV réussi (${filteredAndSortedClients.length} clients)`);
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

  const getStatutBadge = (statut: string | null) => {
    const statusMap: Record<string, { color: string; label: string }> = {
      nouveau: { color: "text-[#3B82F6] border-[#3B82F6]/30 bg-[rgba(59,130,246,0.08)]", label: "Nouveau" },
      en_cours: { color: "text-[#22C55E] border-[#22C55E]/30 bg-[rgba(34,197,94,0.08)]", label: "En cours" },
      attente: { color: "text-[#F59E0B] border-[#F59E0B]/30 bg-[rgba(245,158,11,0.08)]", label: "Attente" },
      resolues: { color: "text-[#10B981] border-[#10B981]/30 bg-[rgba(16,185,129,0.08)]", label: "Résolues" },
      ferme: { color: "text-[#6B7280] border-[#6B7280]/30 bg-[rgba(107,114,128,0.08)]", label: "Fermé" },
      rejete: { color: "text-[#EF4444] border-[#EF4444]/30 bg-[rgba(239,68,68,0.08)]", label: "Rejeté" },
    };
    return statusMap[statut || "nouveau"] || statusMap.nouveau;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Compact Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-bold uppercase tracking-wide">Clients</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setDisplayOptionsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Options
          </Button>
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
            <div className="space-y-6">
              {/* Section Coordonnées */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide border-b border-white/10 pb-2">Coordonnées</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="nom">Nom *</Label>
                    <Input
                      id="nom"
                      value={newClient.nom}
                      onChange={(e) => setNewClient({ ...newClient, nom: e.target.value })}
                      className="glass-card"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      className="glass-card"
                      placeholder="email@exemple.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input
                      id="telephone"
                      value={newClient.telephone}
                      onChange={(e) => setNewClient({ ...newClient, telephone: e.target.value })}
                      className="glass-card"
                      placeholder="+33..."
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
                  <div className="col-span-2">
                    <Label htmlFor="tva">Numéro TVA</Label>
                    <Input
                      id="tva"
                      value={newClient.tva}
                      onChange={(e) => setNewClient({ ...newClient, tva: e.target.value })}
                      className="glass-card"
                    />
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
                </div>
              </div>

              {/* Section Suivi chantier */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide border-b border-white/10 pb-2">Suivi chantier</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="demande">Demande</Label>
                    <Textarea
                      id="demande"
                      value={newClient.demande}
                      onChange={(e) => setNewClient({ ...newClient, demande: e.target.value })}
                      className="glass-card"
                      rows={3}
                      placeholder="Description de la demande du client..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="debut">Date début</Label>
                    <Input
                      id="debut"
                      type="date"
                      value={newClient.debut}
                      onChange={(e) => setNewClient({ ...newClient, debut: e.target.value })}
                      className="glass-card"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fin">Date fin</Label>
                    <Input
                      id="fin"
                      type="date"
                      value={newClient.fin}
                      onChange={(e) => setNewClient({ ...newClient, fin: e.target.value })}
                      className="glass-card"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="statut">Statut</Label>
                    <select
                      id="statut"
                      value={newClient.statut}
                      onChange={(e) => setNewClient({ ...newClient, statut: e.target.value })}
                      className="w-full p-2 glass-card rounded-md"
                    >
                      <option value="nouveau">Nouveau</option>
                      <option value="en_cours">En cours</option>
                      <option value="attente">Attente</option>
                      <option value="resolues">Résolues</option>
                      <option value="ferme">Fermé</option>
                      <option value="rejete">Rejeté</option>
                    </select>
                  </div>
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
              placeholder="Rechercher par nom, email, téléphone, ville, adresse, TVA, tags..."
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
                        <SelectItem value="nouveau">Nouveau</SelectItem>
                        <SelectItem value="en_cours">En cours</SelectItem>
                        <SelectItem value="attente">Attente</SelectItem>
                        <SelectItem value="resolues">Résolues</SelectItem>
                        <SelectItem value="ferme">Fermé</SelectItem>
                        <SelectItem value="rejete">Rejeté</SelectItem>
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

        {/* Quick Filter Chips */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={activeQuickFilters.has("actifs") ? "default" : "outline"}
            size="sm"
            onClick={() => toggleQuickFilter("actifs")}
            className="h-7 text-xs"
          >
            Actifs
          </Button>
          <Button
            variant={activeQuickFilters.has("factures_encaisser") ? "default" : "outline"}
            size="sm"
            onClick={() => toggleQuickFilter("factures_encaisser")}
            className="h-7 text-xs"
          >
            Avec factures à encaisser
          </Button>
          <Button
            variant={activeQuickFilters.has("en_retard") ? "default" : "outline"}
            size="sm"
            onClick={() => toggleQuickFilter("en_retard")}
            className="h-7 text-xs"
          >
            En retard
          </Button>
          <Button
            variant={activeQuickFilters.has("devis_acceptes") ? "default" : "outline"}
            size="sm"
            onClick={() => toggleQuickFilter("devis_acceptes")}
            className="h-7 text-xs"
          >
            Devis acceptés
          </Button>
          <Button
            variant={activeQuickFilters.has("jobs_cours") ? "default" : "outline"}
            size="sm"
            onClick={() => toggleQuickFilter("jobs_cours")}
            className="h-7 text-xs"
          >
            Jobs en cours
          </Button>
          <Button
            variant={activeQuickFilters.has("echeance_semaine") ? "default" : "outline"}
            size="sm"
            onClick={() => toggleQuickFilter("echeance_semaine")}
            className="h-7 text-xs"
          >
            Échéance cette semaine
          </Button>
          <Button
            variant={activeQuickFilters.has("sans_activite") ? "default" : "outline"}
            size="sm"
            onClick={() => toggleQuickFilter("sans_activite")}
            className="h-7 text-xs"
          >
            Sans activité 30 j
          </Button>
        </div>

        {/* Result count and pagination controls */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div>
            {filteredAndSortedClients.length} client{filteredAndSortedClients.length !== 1 ? "s" : ""} trouvé{filteredAndSortedClients.length !== 1 ? "s" : ""}
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Afficher</Label>
            <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
              <SelectTrigger className="h-7 w-16 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table with Synthesis Columns */}
      <div className="glass-card overflow-hidden">
        {filteredAndSortedClients.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-2">Aucun client ne correspond aux filtres</p>
            <Button variant="outline" size="sm" onClick={() => {
              setSearch("");
              setFilterStatus("all");
              setFilterTag("all");
              setActiveQuickFilters(new Set());
            }}>
              Réinitialiser les filtres
            </Button>
          </div>
        ) : (
          <>
            {/* Bulk Delete Toolbar */}
            <div className="p-4 border-b border-white/10">
              <BulkDeleteToolbar
                selectedCount={selectedCount}
                totalCount={filteredAndSortedClients.length}
                onSelectAll={toggleAll}
                onDelete={handleBulkDelete}
                entityName="client"
                allSelected={allSelected}
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10 sticky top-0 glass-card z-10">
                  <tr>
                    <th className="text-left p-2 font-semibold uppercase tracking-wide text-xs w-8">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleAll}
                        aria-label="Tout sélectionner"
                      />
                    </th>
                    <th className="text-left p-2 font-semibold uppercase tracking-wide text-xs w-8"></th>
                    <th 
                      className="text-left p-2 font-semibold uppercase tracking-wide text-xs cursor-pointer hover:text-primary transition-colors select-none"
                      onClick={(e) => handleSort("nom", e.shiftKey)}
                      title="Cliquez pour trier, Shift+Clic pour multi-tri"
                    >
                      <span className="flex items-center">
                        Nom{getSortIndicator("nom")}
                      </span>
                    </th>
                    <th 
                      className="text-left p-2 font-semibold uppercase tracking-wide text-xs cursor-pointer hover:text-primary transition-colors select-none"
                      onClick={(e) => handleSort("statut", e.shiftKey)}
                      title="Cliquez pour trier, Shift+Clic pour multi-tri"
                    >
                      <span className="flex items-center">
                        Statut{getSortIndicator("statut")}
                      </span>
                    </th>
                    <th className="text-left p-2 font-semibold uppercase tracking-wide text-xs">Tags</th>
                    <th className="text-left p-2 font-semibold uppercase tracking-wide text-xs">Téléphone</th>
                    <th 
                      className="text-left p-2 font-semibold uppercase tracking-wide text-xs cursor-pointer hover:text-primary transition-colors select-none"
                      onClick={(e) => handleSort("ville", e.shiftKey)}
                      title="Cliquez pour trier, Shift+Clic pour multi-tri"
                    >
                      <span className="flex items-center">
                        Ville{getSortIndicator("ville")}
                      </span>
                    </th>
                    <th className="text-left p-2 font-semibold uppercase tracking-wide text-xs">Adresse</th>
                    <th 
                      className="text-left p-2 font-semibold uppercase tracking-wide text-xs cursor-pointer hover:text-primary transition-colors select-none"
                      onClick={(e) => handleSort("devis", e.shiftKey)}
                      title="Cliquez pour trier, Shift+Clic pour multi-tri"
                    >
                      <span className="flex items-center">
                        Devis{getSortIndicator("devis")}
                      </span>
                    </th>
                    <th 
                      className="text-left p-2 font-semibold uppercase tracking-wide text-xs cursor-pointer hover:text-primary transition-colors select-none"
                      onClick={(e) => handleSort("factures", e.shiftKey)}
                      title="Cliquez pour trier, Shift+Clic pour multi-tri"
                    >
                      <span className="flex items-center">
                        Factures{getSortIndicator("factures")}
                      </span>
                    </th>
                    <th 
                      className="text-left p-2 font-semibold uppercase tracking-wide text-xs cursor-pointer hover:text-primary transition-colors select-none"
                      onClick={(e) => handleSort("jobs", e.shiftKey)}
                      title="Cliquez pour trier, Shift+Clic pour multi-tri"
                    >
                      <span className="flex items-center">
                        Jobs{getSortIndicator("jobs")}
                      </span>
                    </th>
                    <th 
                      className="text-left p-2 font-semibold uppercase tracking-wide text-xs cursor-pointer hover:text-primary transition-colors select-none"
                      onClick={(e) => handleSort("planning", e.shiftKey)}
                      title="Cliquez pour trier, Shift+Clic pour multi-tri"
                    >
                      <span className="flex items-center">
                        Planning{getSortIndicator("planning")}
                      </span>
                    </th>
                    <th 
                      className="text-left p-2 font-semibold uppercase tracking-wide text-xs cursor-pointer hover:text-primary transition-colors select-none"
                      onClick={(e) => handleSort("activite", e.shiftKey)}
                      title="Cliquez pour trier, Shift+Clic pour multi-tri"
                    >
                      <span className="flex items-center">
                        Activité{getSortIndicator("activite")}
                      </span>
                    </th>
                    <th className="text-left p-2 font-semibold uppercase tracking-wide text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedClients.map((client) => {
                const summary = clientsSummary.get(client.id);
                const isExpanded = expandedRows.has(client.id);
                return (
                  <>
                    <tr
                      key={client.id}
                      className="border-b border-white/5 hover:bg-muted/20 transition-colors"
                    >
                      <td className="p-2">
                        <Checkbox
                          checked={isSelected(client.id)}
                          onCheckedChange={() => toggleItem(client.id)}
                          aria-label={`Sélectionner ${client.nom}`}
                        />
                      </td>
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
                      <td className="p-2">
                        <div 
                          className="font-semibold text-sm hover:underline cursor-pointer"
                          onClick={() => navigate(`/clients/${client.id}`)}
                        >
                          {highlightMatch(client.nom, debouncedSearch)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {client.email && highlightMatch(client.email, debouncedSearch)}
                        </div>
                      </td>
                      <td className="p-2">
                        {(() => {
                          const badge = getStatutBadge(client.statut);
                          return (
                            <span 
                              className={`inline-block rounded-full px-3 py-1 text-[13px] font-medium tracking-[.01em] backdrop-blur-[8px] border transition-all hover:translate-y-[0.5px] hover:border-current/45 shadow-[0_2px_8px_rgba(0,0,0,.06)] ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                          );
                        })()}
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
                        {client.telephone ? (
                          <a 
                            href={`tel:${client.telephone}`}
                            className="text-xs flex items-center gap-1 hover:text-primary transition-colors"
                          >
                            <Phone className="h-3 w-3" />
                            {client.telephone}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-2">
                        <span className="text-xs">
                          {client.ville ? highlightMatch(client.ville, debouncedSearch) : "—"}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className="text-xs truncate max-w-[150px] block" title={client.adresse || ""}>
                          {client.adresse ? highlightMatch(client.adresse, debouncedSearch) : "—"}
                        </span>
                      </td>
                      <td className="p-2">
                        {summary && (
                          <button
                            onClick={() => navigate(`/devis?client_id=${client.id}`)}
                            className="text-left hover:outline hover:outline-1 hover:outline-primary/30 rounded px-2 py-1 -mx-2 -my-1 transition-all cursor-pointer"
                          >
                            <div className="text-xs font-medium mb-1">{summary.devisCount} devis</div>
                            {summary.devisStatus && summary.devisStatusVariant && (
                              <StatusChip variant={summary.devisStatusVariant}>
                                {summary.devisStatus}
                              </StatusChip>
                            )}
                          </button>
                        )}
                      </td>
                      <td className="p-2">
                        {summary && (
                          <button
                            onClick={() => navigate(`/factures?client_id=${client.id}`)}
                            className="text-left hover:outline hover:outline-1 hover:outline-primary/30 rounded px-2 py-1 -mx-2 -my-1 transition-all cursor-pointer"
                          >
                            <div className="text-xs font-medium mb-1">
                              {summary.facturesUnpaid}/{summary.facturesCount} · {summary.facturesAmountDue.toLocaleString()}€
                            </div>
                            {summary.factureStatus && summary.factureStatusVariant && (
                              <StatusChip variant={summary.factureStatusVariant}>
                                {summary.factureStatus}
                              </StatusChip>
                            )}
                          </button>
                        )}
                      </td>
                      <td className="p-2">
                        {summary && (
                          <button
                            onClick={() => navigate(`/jobs?client_id=${client.id}`)}
                            className="text-left hover:outline hover:outline-1 hover:outline-primary/30 rounded px-2 py-1 -mx-2 -my-1 transition-all cursor-pointer"
                          >
                            <div className="text-xs font-medium mb-1">{summary.jobsStatus}</div>
                            {summary.jobStatusVariant && (
                              <StatusChip variant={summary.jobStatusVariant}>
                                {summary.jobStatusVariant === "blue" ? "En cours" : "Terminé"}
                              </StatusChip>
                            )}
                          </button>
                        )}
                      </td>
                      <td className="p-2">
                        {summary?.nextPlanning ? (
                          <button
                            onClick={() => navigate(`/planning?client_id=${client.id}`)}
                            className="text-left hover:outline hover:outline-1 hover:outline-primary/30 rounded px-2 py-1 -mx-2 -my-1 transition-all cursor-pointer"
                            title={summary.nextPlanning.employee || ""}
                          >
                            <div className="text-xs font-medium">
                              {new Date(summary.nextPlanning.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                            </div>
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
                            className="h-7 w-7 p-0 hover:bg-primary/10"
                            title="Voir fiche"
                            onClick={() => navigate(`/clients/${client.id}`)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 hover:bg-primary/10"
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
                            className="h-7 w-7 p-0 hover:bg-destructive/10"
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
                        <td colSpan={14} className="p-4">
                          <ExpandedClientView clientId={client.id} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-white/10 p-3 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Page {currentPage} sur {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="glass-modal max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="uppercase tracking-wide">Modifier Client</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-6">
              {/* Section Coordonnées */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide border-b border-white/10 pb-2">Coordonnées</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nom *</Label>
                    <Input
                      value={selectedClient.nom}
                      onChange={(e) => setSelectedClient({ ...selectedClient, nom: e.target.value })}
                      className="glass-card"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={selectedClient.email}
                      onChange={(e) => setSelectedClient({ ...selectedClient, email: e.target.value })}
                      className="glass-card"
                    />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input
                      value={selectedClient.telephone || ""}
                      onChange={(e) => setSelectedClient({ ...selectedClient, telephone: e.target.value })}
                      className="glass-card"
                    />
                  </div>
                  <div>
                    <Label>Ville</Label>
                    <Input
                      value={selectedClient.ville || ""}
                      onChange={(e) => setSelectedClient({ ...selectedClient, ville: e.target.value })}
                      className="glass-card"
                    />
                  </div>
                  <div>
                    <Label>Adresse</Label>
                    <Input
                      value={selectedClient.adresse || ""}
                      onChange={(e) => setSelectedClient({ ...selectedClient, adresse: e.target.value })}
                      className="glass-card"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Numéro TVA</Label>
                    <Input
                      value={selectedClient.tva || ""}
                      onChange={(e) => setSelectedClient({ ...selectedClient, tva: e.target.value })}
                      className="glass-card"
                    />
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
                </div>
              </div>

              {/* Section Suivi chantier */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide border-b border-white/10 pb-2">Suivi chantier</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Demande</Label>
                    <Textarea
                      value={selectedClient.demande || ""}
                      onChange={(e) => setSelectedClient({ ...selectedClient, demande: e.target.value })}
                      className="glass-card"
                      rows={3}
                      placeholder="Description de la demande du client..."
                    />
                  </div>
                  <div>
                    <Label>Date début</Label>
                    <Input
                      type="date"
                      value={selectedClient.debut || ""}
                      onChange={(e) => setSelectedClient({ ...selectedClient, debut: e.target.value })}
                      className="glass-card"
                    />
                  </div>
                  <div>
                    <Label>Date fin</Label>
                    <Input
                      type="date"
                      value={selectedClient.fin || ""}
                      onChange={(e) => setSelectedClient({ ...selectedClient, fin: e.target.value })}
                      className="glass-card"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Statut</Label>
                    <select
                      value={selectedClient.statut || "nouveau"}
                      onChange={(e) => setSelectedClient({ ...selectedClient, statut: e.target.value })}
                      className="w-full p-2 glass-card rounded-md"
                    >
                      <option value="nouveau">Nouveau</option>
                      <option value="en_cours">En cours</option>
                      <option value="attente">Attente</option>
                      <option value="resolues">Résolues</option>
                      <option value="ferme">Fermé</option>
                      <option value="rejete">Rejeté</option>
                    </select>
                  </div>
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

      {/* Display Options Panel */}
      <DisplayOptionsPanel
        open={displayOptionsOpen}
        onOpenChange={setDisplayOptionsOpen}
        onSave={handleSaveDisplayOptions}
        currentOptions={displayOptions}
      />
    </div>
  );
};

export default Clients;
