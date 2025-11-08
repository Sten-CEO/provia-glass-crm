import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Eye, Search, Edit } from "lucide-react";
import { StatusChip } from "@/components/ui/status-chip";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  statut: "Brouillon" | "Envoyé" | "Accepté" | "Refusé" | "Expiré";
  expiry_date?: string;
  created_at: string;
}

const Devis = () => {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  const loadQuotes = async () => {
    const { data, error } = await supabase
      .from("devis")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erreur de chargement");
      return;
    }

    setQuotes((data || []) as Quote[]);
  };

  useEffect(() => {
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
  }, []);

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
    if (filterStatus === "Envoyés") matchesStatus = q.statut === "Envoyé";
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
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
                  className="border-b border-white/5 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/devis/${quote.id}`)}
                >
                  <td className="p-4">
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
                    <div className="flex items-center gap-2">
                      <StatusChip variant={getStatusVariant(quote.statut)}>
                        {quote.statut}
                      </StatusChip>
                      {isExpired(quote) && (
                        <StatusChip variant="gray">Expiré</StatusChip>
                      )}
                    </div>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/devis/${quote.id}/edit`);
                        }}
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
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
    </div>
  );
};

export default Devis;
