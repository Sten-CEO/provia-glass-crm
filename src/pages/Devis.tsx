import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Eye, Search, Edit, Menu, Mail, FileCheck } from "lucide-react";
import { QuoteSendModal } from "@/components/devis/QuoteSendModal";
import { StatusChip } from "@/components/ui/status-chip";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BulkDeleteToolbar } from "@/components/common/BulkDeleteToolbar";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { useCurrentCompany } from "@/hooks/useCurrentCompany";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { eventBus, EVENTS } from "@/lib/eventBus";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Quote {
  id: string;
  numero: string;
  client_id: string | null;
  client_nom: string;
  montant: string;
  total_ttc: number;
  statut: "Brouillon" | "Envoyé" | "Accepté" | "Signé" | "Refusé" | "Annulé" | "Expiré";
  expiry_date?: string;
  created_at: string;
}

const Devis = () => {
  const navigate = useNavigate();
  const { companyId, loading: companyLoading } = useCurrentCompany();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [filterParams, setFilterParams] = useState<URLSearchParams | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [quoteForAction, setQuoteForAction] = useState<Quote | null>(null);

  // Bulk selection for mass delete
  const {
    selectedIds,
    selectedCount,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    allSelected,
  } = useBulkSelection(quotes);

  const loadQuotes = async () => {
    if (!companyId) return;

    const { data, error } = await supabase
      .from("devis")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement");
      return;
    }

    setQuotes((data || []) as Quote[]);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilterParams(params);
    const filter = params.get("filter");
    if (filter === "to_schedule") {
      setFilterStatus("to_schedule");
    }

    if (companyId) {
      loadQuotes();

      const channel = supabase
        .channel("devis-changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "devis" }, () => {
          loadQuotes();
        })
        .subscribe();

      const handleDataChanged = (data: any) => {
        if (data?.scope === "quotes") {
          loadQuotes();
        }
      };

      eventBus.on(EVENTS.DATA_CHANGED, handleDataChanged);

      return () => {
        supabase.removeChannel(channel);
        eventBus.off(EVENTS.DATA_CHANGED, handleDataChanged);
      };
    }
  }, [companyId]);

  const handleDeleteQuote = async () => {
    if (!selectedQuote) return;

    const { error } = await supabase.from("devis").delete().eq("id", selectedQuote.id);

    if (error) {
      toast.error("Échec de suppression");
      return;
    }

    toast.success("Devis supprimé avec succès");
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: "quotes" });
    setDeleteOpen(false);
    setSelectedQuote(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const { error } = await supabase
      .from("devis")
      .delete()
      .in("id", selectedIds);

    if (error) {
      console.error("Erreur lors de la suppression groupée:", error);
      toast.error("Échec de la suppression groupée");
      return;
    }

    toast.success(`${selectedIds.length} devis supprimé${selectedIds.length > 1 ? "s" : ""} avec succès`);
    clearSelection();
    eventBus.emit(EVENTS.DATA_CHANGED, { scope: "quotes" });
  };

  const getStatusVariant = (status: Quote["statut"]) => {
    if (status === "Accepté") return "green";
    if (status === "Envoyé") return "blue";
    if (status === "Refusé") return "red";
    if (status === "Expiré") return "gray";
    return "gray";
  };

  const isExpired = (quote: Quote) => {
    return quote.expiry_date && new Date(quote.expiry_date) < new Date() && ["Brouillon", "Envoyé"].includes(quote.statut);
  };

  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch = search === "" || 
      q.numero.toLowerCase().includes(search.toLowerCase()) ||
      q.client_nom.toLowerCase().includes(search.toLowerCase());
    
    let matchesStatus = true;
    if (filterStatus === "to_schedule") {
      matchesStatus = q.statut === "Accepté" || q.statut === "Signé";
    } else if (filterStatus === "Envoyés") matchesStatus = q.statut === "Envoyé";
    else if (filterStatus === "Acceptés") matchesStatus = q.statut === "Accepté";
    else if (filterStatus === "Refusés") matchesStatus = q.statut === "Refusé";
    else if (filterStatus === "Brouillons") matchesStatus = q.statut === "Brouillon";
    else if (filterStatus === "Expirés") matchesStatus = isExpired(q);
    else if (filterStatus === "Échéance dépassée") matchesStatus = isExpired(q);
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "PPP", { locale: fr });
    } catch {
      return dateStr;
    }
  };

  // Show loading state while company is loading
  if (companyLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Show error if no company
  if (!companyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center glass-card p-8 max-w-md">
          <h2 className="text-xl font-bold mb-4">Aucune société associée</h2>
          <p className="text-muted-foreground mb-4">
            Votre compte n'est pas associé à une société. Veuillez contacter un administrateur.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold uppercase tracking-wide">Devis</h1>
        <Button
          onClick={() => navigate("/devis/new")}
          className="bg-primary hover:bg-primary/90 text-foreground font-semibold uppercase tracking-wide"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Devis
        </Button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par n° ou client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="to_schedule">À planifier</SelectItem>
              <SelectItem value="Envoyés">Envoyés</SelectItem>
              <SelectItem value="Acceptés">Acceptés</SelectItem>
              <SelectItem value="Refusés">Refusés</SelectItem>
              <SelectItem value="Brouillons">Brouillons</SelectItem>
              <SelectItem value="Expirés">Expirés</SelectItem>
              <SelectItem value="Échéance dépassée">Échéance dépassée</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <BulkDeleteToolbar
            selectedCount={selectedCount}
            totalCount={filteredQuotes.length}
            onSelectAll={toggleAll}
            onDelete={handleBulkDelete}
            entityName="devis"
            allSelected={allSelected}
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm w-8">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Tout sélectionner"
                  />
                </th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">N°</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Client</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Total TTC</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Statut</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Échéance</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Créé le</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map((quote) => (
                <tr
                  key={quote.id}
                  className="border-b border-white/5 hover:bg-muted/30 transition-colors"
                >
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected(quote.id)}
                      onCheckedChange={() => toggleItem(quote.id)}
                      aria-label={`Sélectionner ${quote.numero}`}
                    />
                  </td>
                  <td className="p-4 cursor-pointer" onClick={() => navigate(`/devis/${quote.id}`)}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/devis/${quote.id}`);
                      }}
                      className="font-medium hover:underline"
                    >
                      {quote.numero}
                    </button>
                  </td>
                  <td className="p-4 text-muted-foreground">{quote.client_nom}</td>
                  <td className="p-4 font-semibold">
                    €{(quote.total_ttc || parseFloat(quote.montant) || 0).toFixed(2)}
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <Select 
                      value={quote.statut} 
                      onValueChange={async (newStatus) => {
                        const { error } = await supabase
                          .from("devis")
                          .update({ statut: newStatus })
                          .eq("id", quote.id);
                        
                        if (error) {
                          toast.error("Erreur lors du changement de statut");
                          return;
                        }
                        
                        // Tentative de création auto d'intervention si demandé
                        try {
                          const { data: q } = await supabase
                            .from("devis")
                            .select("id, numero, client_id, client_nom, title, auto_create_job_on_accept, planned_date, planned_start_time, planned_end_time, assignee_id, site_address, property_address, message_client, lignes")
                            .eq("id", quote.id)
                            .maybeSingle();
                          
                          if (q && q.auto_create_job_on_accept && (newStatus === "Accepté" || newStatus === "Signé")) {
                            const { data: existingJob } = await supabase
                              .from("jobs")
                              .select("id")
                              .eq("quote_id", q.id)
                              .maybeSingle();
                            
                            if (!existingJob) {
                              let employeNom = "";
                              if (q.assignee_id) {
                                const { data: emp } = await supabase
                                  .from("equipe")
                                  .select("nom")
                                  .eq("id", q.assignee_id)
                                  .maybeSingle();
                                employeNom = emp?.nom || "";
                              }
                              const jobPayload = {
                                titre: q.title || `Intervention suite au devis ${q.numero}`,
                                client_id: q.client_id,
                                client_nom: q.client_nom || "",
                                employe_id: q.assignee_id || null,
                                employe_nom: employeNom,
                                assigned_employee_ids: q.assignee_id ? [q.assignee_id] : [],
                                date: q.planned_date || new Date().toISOString().split("T")[0],
                                heure_debut: q.planned_start_time || null,
                                heure_fin: q.planned_end_time || null,
                                statut: "À faire",
                                adresse: q.site_address || q.property_address || "",
                                description: q.message_client || q.title || "",
                                notes: `Créée automatiquement depuis le devis ${q.numero}`,
                                quote_id: q.id,
                                checklist: Array.isArray(q.lignes) ? (q.lignes as any[]).map((l: any) => ({ id: crypto.randomUUID(), label: l.name, done: false })) as any : [] as any,
                              };
                              const { data: createdJob, error: jobErr } = await supabase
                                .from("jobs")
                                .insert([jobPayload])
                                .select()
                                .single();
                              
                              if (!jobErr && createdJob) {
                                // Sync consumables and services from quote to intervention
                                try {
                                  const { syncQuoteConsumablesToIntervention } = await import("@/lib/quoteToInterventionSync");
                                  await syncQuoteConsumablesToIntervention(q.id, createdJob.id);
                                } catch (syncError) {
                                  console.error("Error syncing quote items:", syncError);
                                }
                                
                                eventBus.emit(EVENTS.DATA_CHANGED, { scope: "jobs" });
                                eventBus.emit(EVENTS.PLANNING_UPDATED, { scope: "planning" });
                              } else if (jobErr) {
                                console.error("Auto-create job error:", jobErr);
                              }
                            }
                          }
                        } catch (e) {
                          console.error("Auto-create job check failed:", e);
                        }
                        
                        toast.success("Statut mis à jour");
                        loadQuotes();
                      }}
                    >
                      <SelectTrigger className="w-[140px]">
                        <StatusChip variant={getStatusVariant(quote.statut)}>
                          {quote.statut}
                        </StatusChip>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Brouillon">Brouillon</SelectItem>
                        <SelectItem value="Envoyé">Envoyé</SelectItem>
                        <SelectItem value="Accepté">Accepté</SelectItem>
                        <SelectItem value="Refusé">Refusé</SelectItem>
                        <SelectItem value="Annulé">Annulé</SelectItem>
                      </SelectContent>
                    </Select>
                    {isExpired(quote) && (
                      <StatusChip variant="gray" className="ml-2">Expiré</StatusChip>
                    )}
                  </td>
                  <td className="p-4 text-muted-foreground text-sm">
                    {quote.expiry_date ? formatDate(quote.expiry_date) : "—"}
                  </td>
                  <td className="p-4 text-muted-foreground text-sm">
                    {formatDate(quote.created_at)}
                  </td>
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/devis/${quote.id}`);
                        }}
                        title="Voir"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {quote.statut === 'Accepté' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/devis/${quote.id}/signed`);
                          }}
                          title="Voir le devis signé"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <FileCheck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuoteForAction(quote);
                          setSendModalOpen(true);
                        }}
                        title="Envoyer"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedQuote(quote);
                          setDeleteOpen(true);
                        }}
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="glass-modal">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ce devis ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteQuote} className="bg-destructive hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Quote Modal */}
      {quoteForAction && (
        <QuoteSendModal
          open={sendModalOpen}
          onOpenChange={setSendModalOpen}
          quoteId={quoteForAction.id}
          quoteNumber={quoteForAction.numero}
          clientEmail=""
          clientName={quoteForAction.client_nom}
        />
      )}
    </div>
  );
};

export default Devis;
