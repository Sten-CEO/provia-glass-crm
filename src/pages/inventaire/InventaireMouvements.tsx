import { useState, useEffect } from "react";
import { Search, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Movement {
  id: string;
  date: string;
  type: string;
  source: string;
  ref_id: string | null;
  ref_number: string | null;
  qty: number;
  status: string;
  note: string | null;
  inventory_items: {
    name: string;
    type: string;
  } | null;
}

const InventaireMouvements = () => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const loadMovements = async () => {
    const { data, error } = await supabase
      .from("inventory_movements")
      .select(`
        *,
        inventory_items (name, type)
      `)
      .order("date", { ascending: false })
      .limit(200);

    if (error) {
      toast.error("Erreur de chargement");
      return;
    }

    setMovements(data as Movement[]);
  };

  useEffect(() => {
    loadMovements();

    const channel = supabase
      .channel("inventory_movements_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_movements" }, () => {
        loadMovements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getTypeLabel = (type: string, status?: string) => {
    const labels: Record<string, string> = {
      in: "Entrée",
      out: "Sortie",
      reserve: "Réservation",
      expected_out: "Sortie prévue",
    };
    
    // Special handling for planned consumables vs reserved materials
    if (status === "planned") {
      if (type === "expected_out") return "À prévoir (conso)";
      if (type === "reserve") return "Réservé (mat)";
    }
    
    return labels[type] || type;
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "done") return "default";
    if (status === "planned") return "secondary";
    if (status === "canceled") return "destructive";
    return "outline";
  };

  const filteredMovements = movements.filter(m => {
    const matchSearch = search === "" || 
      m.inventory_items?.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.ref_number && m.ref_number.toLowerCase().includes(search.toLowerCase())) ||
      (m.note && m.note.toLowerCase().includes(search.toLowerCase()));
    
    const matchType = typeFilter === "all" || m.type === typeFilter;
    const matchSource = sourceFilter === "all" || m.source === sourceFilter;
    const matchCategory = categoryFilter === "all" || m.inventory_items?.type === categoryFilter;

    return matchSearch && matchType && matchSource && matchCategory;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold uppercase tracking-wide">Mouvements de Stock</h1>

      {/* Filters */}
      <div className="glass-card p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par article, réf, note..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Type</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="in">Entrée</SelectItem>
                <SelectItem value="out">Sortie</SelectItem>
                <SelectItem value="reserve">Réservation</SelectItem>
                <SelectItem value="expected_out">À prévoir</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Source</label>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="achat">Achat</SelectItem>
                <SelectItem value="devis">Devis</SelectItem>
                <SelectItem value="intervention">Intervention</SelectItem>
                <SelectItem value="ajustement">Ajustement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Catégorie</label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="consommable">Consommables</SelectItem>
                <SelectItem value="materiel">Matériels</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block opacity-0">Actions</label>
            <button
              onClick={() => {
                setTypeFilter("all");
                setSourceFilter("all");
                setCategoryFilter("all");
                setSearch("");
              }}
              className="w-full h-10 px-4 glass-card hover:bg-muted/30 transition-colors flex items-center justify-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Date</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Type</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Source</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Réf</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Article</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Cat.</th>
                <th className="text-right p-4 font-semibold uppercase tracking-wide text-sm">Qté</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Statut</th>
                <th className="text-left p-4 font-semibold uppercase tracking-wide text-sm">Note</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((movement) => (
                <tr key={movement.id} className="border-b border-white/5 hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(movement.date).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </td>
                  <td className="p-4">
                    <Badge 
                      variant="outline"
                      className={
                        movement.status === "planned" && movement.type === "expected_out" 
                          ? "bg-orange-500/10 text-orange-600 border-orange-500/20"
                          : movement.status === "planned" && movement.type === "reserve"
                          ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          : ""
                      }
                    >
                      {getTypeLabel(movement.type, movement.status)}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground capitalize">{movement.source}</td>
                  <td className="p-4 text-sm text-muted-foreground">{movement.ref_number || "—"}</td>
                  <td className="p-4">{movement.inventory_items?.name || "—"}</td>
                  <td className="p-4">
                    <Badge variant="secondary" className="text-xs">
                      {movement.inventory_items?.type === "materiel" ? "Mat" : "Conso"}
                    </Badge>
                  </td>
                  <td className="p-4 text-right">
                    <span className={movement.type.includes("out") || movement.type === "reserve" ? "text-destructive" : "text-green-500"}>
                      {movement.type.includes("out") || movement.type === "reserve" ? "-" : "+"}{movement.qty}
                    </span>
                  </td>
                  <td className="p-4">
                    <Badge variant={getStatusVariant(movement.status)}>
                      {movement.status === "done" ? "Effectué" : movement.status === "planned" ? "Prévu" : "Annulé"}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground max-w-[200px] truncate" title={movement.note || ""}>
                    {movement.note || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredMovements.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Aucun mouvement trouvé
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventaireMouvements;
